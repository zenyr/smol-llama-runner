import { useMemo } from "react";

export const usePromptSchema = (model: string) => {
  // const initialText = `The following is a conversation with an AI assistant. The assistant is helpful, creative, clever, and very friendly.`;
  const initialText = `Below is an instruction that describes a task, paired with an input that provides further context. Write a response that appropriately completes the request.`;
  const promptHeader = "\nInstruction:";
  const answerHeader = "\nResponse:";
  const promptFormat = `${promptHeader}{{prompt}}\n${answerHeader}`;

  return useMemo(
    () => ({ initialText, promptHeader, answerHeader, promptFormat }),
    [initialText, promptFormat]
  );
};
