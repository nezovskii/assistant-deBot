import { managementCanister } from "azle/canisters/management";
import {
  update,
  text,
  Record,
  Opt,
  ic,
  Vec,
  Ok,
  Err,
  Result,
  int64,
  Some,
  Principal,
  StableBTreeMap,
  nat16,
  None,
  Null,
} from "azle";
import { OPEN_AI_API_KEY } from "./credential";

export const ASSISTANT_ENDPOINT = "https://api.openai.com/v1/assistants";

const CreatAssiatantPayload = Record({
  model: text,
  name: text,
  description: Opt(text),
  instructions: text,
  tools: Vec(text),
});

const CreateAssistantResponseBody = Record({
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

const ErrorResponse = Record({
  error: Record({
    message: text,
  }),
});

const assistantStorage = StableBTreeMap(
  text,
  Vec(CreateAssistantResponseBody),
  1
);

class Assistant {
  private saveUserAssistant(
    userIdentity: text,
    assistant: typeof CreateAssistantResponseBody
  ) {
    const userAssistants = assistantStorage.get(userIdentity);
    console.log(userAssistants);
    if ("None" in userAssistants) {
      const updtedAssistant = [assistant];
      console.log(updtedAssistant);
      assistantStorage.insert(userIdentity, updtedAssistant);
    } else {
      const assistantIndex = userAssistants.findIndex(
        (assistant: typeof CreateAssistantResponseBody) =>
          assistant.id === assistant.id
      );
      if (assistantIndex !== -1) {
        userAssistants[assistantIndex] = assistant;
        assistantStorage.insert(userIdentity, userAssistants);
      } else {
        const updtedAssistant = [...userAssistants, assistant];
        console.log(updtedAssistant);
        assistantStorage.insert(userIdentity, updtedAssistant);
      }
    }
  }

  private fromatCreateAssistantResponse(
    body: ArrayBufferLike,
    status: nat16
  ): typeof CreateAssistantResponseBody {
    const JSONResponse = JSON.parse(Buffer.from(body).toString("utf-8"));

    if (status !== 200) {
      return JSONResponse;
    }
    return {
      ...JSONResponse,
      tools: JSONResponse.tools.map((tool: any) => tool.type),
    };
  }

  /**
   * save user assistant function
   * @date 11/29/2023 - 11:38:18 AM
   *
   * @param {string} assistantId
   * @param {string} userIdentity
   * @returns {*}
   */
  saveAssistant() {
    return update(
      [text, text],
      Result(CreateAssistantResponseBody, text),
      async (assistantId, userIdentity) => {
        const response = await ic.call(managementCanister.http_request, {
          args: [
            {
              transform: Some({
                function: [ic.id(), "transform"] as [Principal, string],
                context: Uint8Array.from([]),
              }),
              url: `${ASSISTANT_ENDPOINT}/${assistantId}`,
              max_response_bytes: Some(2_000n),
              method: {
                get: null,
              },
              body: None,
              headers: [
                {
                  name: "OpenAI-Beta",
                  value: "assistants=v1",
                },
                {
                  name: "Authorization",
                  value: `Bearer ${OPEN_AI_API_KEY}`,
                },
                {
                  name: "content-type",
                  value: "application/json",
                },
              ],
            },
          ],
          cycles: 50_000_000n,
        });

        const formattedResponse = this.fromatCreateAssistantResponse(
          response.body.buffer,
          Number(response.status)
        );

        if (Number(response.status) !== 200) {
          console.log(
            (formattedResponse as unknown as typeof ErrorResponse).error.message
          );
          return Err(
            (formattedResponse as unknown as typeof ErrorResponse).error.message
          );
        }

        this.saveUserAssistant(userIdentity, formattedResponse);
        return Ok(formattedResponse);
      }
    );
  }
}

const assistant = new Assistant();
export default assistant;