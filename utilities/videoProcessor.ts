import ffmpeg, { FfprobeFormat } from "fluent-ffmpeg";
import ffmpegPath from "ffmpeg-static";
import { path as ffprobePath } from "ffprobe-static";
import { v4 as uuid } from "uuid";
import path from "path";
import { spawn } from "child_process";

ffmpeg.setFfmpegPath(ffmpegPath as string);
ffmpeg.setFfmpegPath(ffprobePath as string);

export default class VideoProcessor {
  public async getThumbnail(path: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      ffmpeg(path)
        .screenshots({
          count: 1,
          timemarks: ["1"],
          size: "320x240",
        })
        .on("error", (err) => {
          reject(err);
        })
        .on("end", (stdout, stderr) => {
          if (stderr) {
            reject(stderr);
            return;
          }
          resolve(stdout);
        });
    });
  }

  public async getMetadata(path: string): Promise<FfprobeFormat> {
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(path, (err, metadata) => {
        if (err) {
          reject(err);
        } else {
          resolve(metadata.format);
        }
      });
    });
  }

  public async getVideoThumbnail(input: string): Promise<string> {
    const outputFilePath = path.join(
      __dirname,
      "../../resources/tmp/thumbnails",
      `${uuid()}.mp4`
    );

    return new Promise((resolve, reject) => {
      let log = "";
      const ffmpegProcess = spawn(ffmpegPath as string, [
        "-i",
        input,
        "-y",
        "-t",
        "3",
        "-ss",
        "00:00:00",
        "-s",
        "640x360",
        "-vf",
        "scale=640:360",
        "-f",
        "mp4",
        outputFilePath,
      ]);

      // Log FFmpeg errors
      ffmpegProcess.stderr.on("data", (data) => {
        log += `${data}\n`;
      });

      // Handle FFmpeg process exit
      ffmpegProcess.on("exit", (code) => {
        if (!code) {
          resolve(outputFilePath);
        } else {
          reject(log);
        }
      });
    });
  }
}
