import { createReadStream } from "fs";
import axios from "axios";
import { THETA_ID, THETA_SECRET } from "../constants/filesystem";

export default class ThetaUploader {
  private readonly options: { id: string; secret: string };
  static initializeFromEnv() {
    return new ThetaUploader({ id: THETA_ID, secret: THETA_SECRET });
  }

  constructor(options: { id: string; secret: string }) {
    this.options = options;
  }

  async upload(path: string, onfulfilled?: () => void): Promise<string> {
    const response = await axios.request({
      url: "https://api.thetavideoapi.com/upload",
      method: "POST",
      headers: {
        "x-tva-sa-id": this.options.id,
        "x-tva-sa-secret": this.options.secret,
      },
    });
    const upload: { presigned_url: string; id: string } =
      response?.data?.body?.uploads[0];

    axios
      .request({
        url: upload.presigned_url,
        method: "PUT",
        headers: {
          "x-tva-sa-id": this.options.id,
          "x-tva-sa-secret": this.options.secret,
        },
        data: createReadStream(path),
      })
      .then(onfulfilled)
      .catch((e) => {
        console.log(e);
      });

    return upload.id;
  }
  async transcode(id: string) {
    const response = await axios.request({
      method: "POST",
      url: "https://api.thetavideoapi.com/video",
      headers: {
        "x-tva-sa-id": this.options.id,
        "x-tva-sa-secret": this.options.secret,
      },
      data: {
        source_upload_id: id,
        playback_policy: "public",
      },
    });
    return response?.data?.body?.videos[0].id;
  }
  async get(
    id: string
  ): Promise<{ playback_uri: string; id: string; progress: number }> {
    if (process.env.NODE_ENV !== "production") {
      return {
        id: "video_naikps4fmw9zx40yyr2bpbkhpz",
        playback_uri:
          "https://media.thetavideoapi.com/video_naikps4fmw9zx40yyr2bpbkhpz/master.m3u8",
        progress: 100,
      };
    }

    const response = await axios.request({
      url: `https://api.thetavideoapi.com/video/${id}`,
      method: "GET",
      headers: {
        "x-tva-sa-id": this.options.id,
        "x-tva-sa-secret": this.options.secret,
      },
    });
    return response?.data?.body?.videos[0];
  }

  async uploadAndTranscode(path: string, onfulfilled?: () => void) {
    const id = await this.transcode(await this.upload(path, onfulfilled));
    return await this.get(id);
  }
}
