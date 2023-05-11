import * as fs from "fs";
import * as openai from "openai";

export default class TranscriptionService {
  private openaiClient: openai.OpenAIApi;

  protected readonly configuration: any;

  constructor(apiKey: string) {
    this.configuration = new openai.Configuration({ apiKey });
    this.openaiClient = new openai.OpenAIApi(this.configuration);
  }

  async transcribe(filePath: string): Promise<any> {
    try {
      const audioFile = fs.createReadStream(filePath);

      const response = await this.openaiClient.createTranscription(
        // @ts-ignore
        audioFile,
        "whisper-1",
        undefined,
        "verbose_json"
      );

      console.log(response.data);
      return response.data;
    } catch (error) {
      console.error("Error transcribing audio:", error);
      throw error;
    }
  }
}
