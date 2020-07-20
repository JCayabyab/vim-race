const { playerDict } = require("../matchmaking/PlayerDict");
const Challenge = require("./Challenge");
const db = require("../db/api");

class ChallengesClient {
  constructor(io, matchmakingClient, showDebug = false) {
    this.io = io;

    this.matchmakingClient = matchmakingClient;

    this.onSend = this.onSend.bind(this);
    this.onDecline = this.onDecline.bind(this);
    this.onCancel = this.onCancel.bind(this);
    this.onAccept = this.onAccept.bind(this);

    this.showDebug = showDebug;
  }

  debug(msg) {
    if (this.debug) {
      console.log(msg);
    }
  }

  addSocketListeners(socket) {
    socket.on(ChallengesClient.commands.SENT, this.onSend);
    socket.on(ChallengesClient.commands.DECLINE, this.onDecline);
    socket.on(ChallengesClient.commands.CANCEL, this.onCancel);
    socket.on(ChallengesClient.commands.ACCEPT, this.onAccept);
  }

  async onSend(data) {
    // add sent challenge and received challenge
    const { sender, receiverUsername } = data;

    const senderSocket = playerDict.getSocket(sender.id);
    const receiver = await db.findUserByUsername(receiverUsername);

    if (!receiver) {
      this.debug(
        `${sender.username} challenge to user ${receiverUsername} failed: Player does not exist`
      );
      senderSocket.emit(ChallengesClient.commands.CANNOT_SEND, {
        error: "Player does not exist",
      });
      return;
    }

    if (!playerDict.playerOnline(receiver.id)) {
      this.debug(
        `${sender.id} challenge to user ${receiverUsername} failed: Player is not online`
      );
      senderSocket.emit(ChallengesClient.commands.CANNOT_SEND, {
        error: "Player is not online",
      });
      return;
    }

    if (sender.id === receiver.id) {
      this.debug(
        `${sender.id} challenge to user ${receiverUsername} failed: Cannot send a challenge to yourself`
      );
      senderSocket.emit(ChallengesClient.commands.CANNOT_SEND, {
        error: "Cannot send a challenge to yourself",
      });
      return;
    }

    this.debug(`${sender.id} sent challenge to user ${receiver.id}`);

    const receiverSocket = playerDict.getSocket(receiver.id);
    const challenge = new Challenge(
      sender.id,
      sender.username,
      receiver.id,
      receiver.username
    );
    playerDict.addChallenge(challenge);
    senderSocket.emit(ChallengesClient.commands.SENT, { challenge });
    receiverSocket.emit(ChallengesClient.commands.NEW_CHALLENGE, { challenge });
  }

  onDecline(data) {
    // id of challenge receiver
    const { id, challengeUuid } = data;
    const challenge = playerDict.getChallengeByReceiverUuid(id, challengeUuid);

    this.debug(
      `${challenge.receiverId} declined challenge from ${challenge.senderId}`
    );

    playerDict.removeChallenge(challenge);

    const senderSocket = playerDict.getSocket(challenge.senderId);
    const receiverSocket = playerDict.getSocket(challenge.receiverId);
    senderSocket.emit(ChallengesClient.commands.REMOVE, { challenge });
    receiverSocket.emit(ChallengesClient.commands.REMOVE, { challenge });
  }

  onCancel(data) {
    // id of challenge sender
    const { id, challengeUuid } = data;
    const challenge = playerDict.getChallengeBySenderUuid(id, challengeUuid);

    this.debug(
      `${challenge.senderId} cancelled challenge to ${challenge.receiverId}`
    );

    playerDict.removeChallenge(challenge);

    const senderSocket = playerDict.getSocket(challenge.senderId);
    const receiverSocket = playerDict.getSocket(challenge.receiverId);
    senderSocket.emit(ChallengesClient.commands.REMOVE, { challenge });
    receiverSocket.emit(ChallengesClient.commands.REMOVE, { challenge });
  }

  async onAccept(data) {
    // id of challenge receiver
    const { id, challengeUuid } = data;

    const challenge = playerDict.getChallengeByReceiverUuid(id, challengeUuid);

    this.debug(
      `${challenge.receiverId} accepted challenge from ${challenge.senderId}`
    );

    const senderSocket = playerDict.getSocket(challenge.senderId);
    const receiverSocket = playerDict.getSocket(challenge.receiverId);

    // cancel all sent challenges when players enter game
    const senderSentChallengesAndUsers = playerDict.getOtherSentChallengeUsers(
      challenge.senderId
    );
    const receiverSentChallengesAndUsers = playerDict.getOtherSentChallengeUsers(
      challenge.receiverId
    );

    playerDict.removeUserSentChallenges(challenge.senderId);
    playerDict.removeUserSentChallenges(challenge.receiverId);

    this.notifyOnRemoveOtherChallenges(senderSentChallengesAndUsers);
    this.notifyOnRemoveOtherChallenges(receiverSentChallengesAndUsers);



    await this.matchmakingClient.createMatch(
      challenge.senderId,
      challenge.receiverId,
      senderSocket,
      receiverSocket
    );
  }

  notifyOnRemoveOtherChallenges(otherUsersAndChallenges) {
    for (const userId of Object.keys(otherUsersAndChallenges)) {
      const socket = playerDict.getSocket(userId);
      const challenges = otherUsersAndChallenges[userId];
      for (const challenge of challenges) {
        console.log(challenge, userId);
        socket.emit(ChallengesClient.commands.REMOVE, { challenge });
      }
    }
  }
}

ChallengesClient.commands = {
  NEW_CHALLENGE: "new challenge",
  SENT: "sent challenge",
  CANNOT_SEND: "cannot send challenge",
  REMOVE: "remove challenge",
  DECLINE: "decline challenge",
  CANCEL: "cancel challenge",
  ACCEPT: "accept challenge",
};

module.exports = ChallengesClient;
