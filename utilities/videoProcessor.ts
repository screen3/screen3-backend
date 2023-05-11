import ffmpegPath from "ffmpeg-static";
import { path as ffprobePath } from "ffprobe-static";
import { v4 as uuid } from "uuid";
import { join } from "path";
import { spawn } from "child_process";

export default class FFmpegVideoProcessor {
  private readonly outputDir: string;

  constructor(outputDir: string) {
    this.outputDir = outputDir;
  }
  public extractAudio(inputFilePath: string): Promise<string> {
    const fileName = this.fileName("wav");
    return new Promise((resolve, reject) => {
      const ffmpegArgs = [
        "-i",
        inputFilePath,
        "-vn",
        "-acodec",
        "pcm_s16le",
        join(this.outputDir, fileName),
      ];

      this.ffmpegProcess(ffmpegArgs).on("close", (code) => {
        if (code === 0) {
          resolve(fileName);
        } else {
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });
    });
  }

  public getVideoThumbnail(inputFilePath: string): Promise<string> {
    const fileName = this.fileName("mp4");
    return new Promise((resolve, reject) => {
      const ffmpegArgs = [
        "-i",
        inputFilePath,
        "-ss",
        "00:00:00",
        "-t",
        "3",
        "-vf",
        "scale=-1:360",
        "-an",
        join(this.outputDir, fileName),
      ];
      this.ffmpegProcess(ffmpegArgs).on("close", (code) => {
        if (code === 0) {
          resolve(fileName);
        } else {
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });
    });
  }

  public getImageThumbnail(inputFilePath: string): Promise<string> {
    const fileName = this.fileName("png");

    return new Promise((resolve, reject) => {
      const ffmpegArgs = [
        "-i",
        inputFilePath,
        "-ss",
        "00:00:00",
        "-vf",
        "scale=-1:480",
        "-frames:v",
        "1",
        "-q:v",
        "2",
        join(this.outputDir, fileName),
      ];

      this.ffmpegProcess(ffmpegArgs).on("close", (code) => {
        if (code === 0) {
          resolve(fileName);
        } else {
          reject(new Error(`FFmpeg exited with code ${code}`));
        }
      });
    });
  }

  public getMetadata(inputFilePath: string): Promise<FfprobeFormat> {
    return new Promise((resolve, reject) => {
      const ffprobeArgs = [
        "-v",
        "error",
        "-select_streams",
        "v:0",
        "-show_entries",
        "format=size,duration",
        "-of",
        "json",
        inputFilePath,
      ];

      const ffprobeProcess = spawn(ffprobePath, ffprobeArgs);

      let metadata = "";

      ffprobeProcess.stdout.on("data", (data) => {
        metadata += data.toString();
      });

      ffprobeProcess.on("close", (code) => {
        if (code === 0) {
          const parsedMetadata = JSON.parse(metadata);
          if (parsedMetadata.format) {
            resolve(parsedMetadata.format);
          } else {
            reject(new Error("Invalid video metadata"));
          }
        } else {
          reject(new Error(`FFprobe exited with code ${code}`));
        }
      });
    });
  }

  private ffmpegProcess(ffmpegArgs: string[]) {
    return spawn(ffmpegPath as string, ffmpegArgs);
  }

  private fileName(extension: string) {
    return `${uuid()}.${extension}`;
  }
}

interface FfprobeFormat {
  [key: string]: any;
  filename?: string | undefined;
  nb_streams?: number | undefined;
  nb_programs?: number | undefined;
  format_name?: string | undefined;
  format_long_name?: string | undefined;
  start_time?: number | undefined;
  duration?: number | undefined;
  size?: number | undefined;
  bit_rate?: number | undefined;
  probe_score?: number | undefined;
  tags?: Record<string, string | number> | undefined;
}
