import * as openai from "openai";

class TextSummarizer {
  private openaiClient: openai.OpenAIApi;

  protected readonly configuration: any;

  constructor(apiKey: string) {
    this.configuration = new openai.Configuration({ apiKey });
    this.openaiClient = new openai.OpenAIApi(this.configuration);
  }

  async generateSummary(text: string): Promise<string> {
    const completion = await this.openaiClient.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content:
            "You are a note taker you are to deduce summaries of conversations focusing on key-points and action points",
        },
        { role: "user", content: text },
      ],
    });

    return completion.data.choices[0]?.message?.content.trim() as string;
  }
}

export default TextSummarizer;
