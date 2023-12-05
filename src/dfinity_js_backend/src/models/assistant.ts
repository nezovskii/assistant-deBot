import { Null, Opt, Record, Vec, int64, nat, nat64, text } from "azle";

export const CreateAssistantResponseBody = Record({
  id: text,
  object: text,
  created_at: int64,
  name: text,
  description: Null || Opt(text),
  model: text,
  instructions: text,
  tools: Vec(text),
  file_ids: Vec(text),
  metadata: Record({}),
});

export const Thread = Record({
  id: text,
  object: text,
  created_at: nat64,
  metadata: Record({}),
});

export const CreateThead = Record({
  assistantId: text,
  thread: Thread,
});
