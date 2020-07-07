import { useCallback } from "react";

/**
 * Handles text extraction from export callback in Vim
 * @param {*} socket The socket object initialized by GameClient - used for sending extracted text
 * @param {*} isUserClient True if this is the user client instead of the opponent's client. Used to prevent
 * @param {*} sendSubmissionToSocket Helper function to send submission text to client
 * a submission from the opponent client on your site
 */
const useVimTextExtractor = (isUserClient, sendSubmissionToSocket, user) => {
  const validateSubmission = useCallback(
    (_, contents) => {
      // only send validate if your own client
      if (isUserClient) {
        // convert arraybuffer back into string
        const ab2str = (buf) => {
          return String.fromCharCode.apply(null, new Uint8Array(buf));
        };

        // trim to remove whitespace added at beginning or left at end
        const submissionText = ab2str(contents).trim();
        sendSubmissionToSocket(user.id, submissionText);
      } else {
        // still send to GameClient object to see when opponent sends object
        sendSubmissionToSocket(user.id, null);
      }
    },
    [isUserClient, sendSubmissionToSocket, user]
  );

  return [validateSubmission];
};

export default useVimTextExtractor;