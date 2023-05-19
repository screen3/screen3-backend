import { Express, Request, RequestHandler, Response } from "express";
import multer from "multer";
import Validator from "../../app/validator";
import { EventEmitter } from "../../app/event";
import { StatusCodes } from "http-status-codes";
import { AuthMiddleware } from "../../app/jwtAuthenticator";
import { UserTypes } from "../../constants/user";
import VideoProcessor from "../../utilities/videoProcessor";
import ThetaUploader from "../../utilities/thetaUploader";
import { unlinkSync } from "fs";
import { Video } from "./video";
import { basePath } from "../../utilities/file";
import { v4 as uuid } from "uuid";
import AwsStorage from "../../utilities/awsStorage";
import TranscriptionService from "../../utilities/transcriptionService";
import { OPENAI_KEY } from "../../constants/app";
import { TEMP_VIDEO_DIR_PATH } from "../../constants/filesystem";
import { join } from "path";
import TextSummarizer from "../../utilities/textSummarizer";

const uploader = multer({
  storage: multer.diskStorage({
    destination: "resources/tmp/videos",
    filename: (req, file, cb) => {
      const strings = file.originalname.split(".");
      cb(null, file.fieldname + uuid() + "." + strings[strings.length - 1]);
    },
  }),
});
export default class UserVideoUploadController {
  private readonly validator = new Validator();
  private readonly db: UserVideoUploadDB;
  private readonly emitter: EventEmitter;
  private readonly authenticator: AuthMiddleware;
  private readonly videoProcessor: VideoProcessor;
  private readonly videoStorage: ThetaUploader;
  private readonly fs: AwsStorage;
  private readonly transcriber: TranscriptionService;
  private summarizer: TextSummarizer;

  constructor(
    db: UserVideoUploadDB,
    emitter: EventEmitter,
    authenticator: AuthMiddleware,
    videoProcessor: VideoProcessor = new VideoProcessor(TEMP_VIDEO_DIR_PATH),
    uploader: ThetaUploader = ThetaUploader.initializeFromEnv(),
    fs: AwsStorage = AwsStorage.initDo(TEMP_VIDEO_DIR_PATH),
    transcription: TranscriptionService = new TranscriptionService(OPENAI_KEY),
    summarizer: TextSummarizer = new TextSummarizer(OPENAI_KEY)
  ) {
    this.db = db;
    this.emitter = emitter;
    this.authenticator = authenticator;
    this.videoProcessor = videoProcessor;
    this.videoStorage = uploader;
    this.fs = fs;
    this.transcriber = transcription;
    this.summarizer = summarizer;
  }
  registerRoutes(express: Express) {
    express.post(
      "/video/upload",
      this.authenticator.middleware(UserTypes.USER),
      uploader.single("video"),
      this.upload()
    );
  }
  private upload(): RequestHandler {
    return async (
      req: Request<
        any,
        any,
        {
          id: string;
          spaceId?: string;
          title?: string;
          description?: string;
          tags: { id: string; title: string; color: string }[];
        }
      >,
      res: Response
    ) => {
      const body = { ...req.body, video: req?.file?.path };

      try {
        await this.validator.validate(
          {
            video: this.validator.string().required(),
            id: this.validator.string().required(),
          },
          body
        );
      } catch (e) {
        return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(e);
      }

      const path = basePath(body.video);
      this.videoProcessor
        .getMetadata(path)
        .then((data) => {
          this.db.update(
            { id: body.id, creator: res.locals.user.id },
            { duration: data.duration as number }
          );
        })
        .catch((e) => {
          console.error(e);
        });

      this.videoProcessor
        .getImageThumbnail(path)
        .then(async (path) => {
          return {
            url: await this.fs.uploadFile(path, "screen3"),
            path: path,
          };
        })
        .then(async (data) => {
          await this.db.update(
            { id: body.id, creator: res.locals.user.id },
            { imageThumbnailUrl: data.url }
          );
          return data.path;
        })
        .then((path) => {
          unlinkSync(join(TEMP_VIDEO_DIR_PATH, path));
        })
        .catch((e) => {
          console.error(e);
        });

      this.videoProcessor
        .extractAudio(path)
        .then(async (path) => {
          const _path = join(TEMP_VIDEO_DIR_PATH, path);
          const transcript = await this.transcriber.transcribe(_path);
          return {
            text: transcript.text,
            segments: transcript.segments,
            path: _path,
          };
        })
        .then(async (data) => {
          return {
            summary: await this.summarizer.generateSummary(data.text),
            segments: data.segments,
            path: data.path,
          };
        })
        .then(async (data) => {
          await this.db.update(
            { id: body.id, creator: res.locals.user.id },
            { summary: data.summary, transcription: data.segments }
          );
          return data.path;
        })
        .then((path) => {
          unlinkSync(path);
        })
        .catch((e) => {
          console.error(e);
        });

      this.videoProcessor
        .getVideoThumbnail(path)
        .then(async (path) => {
          return {
            url: await this.fs.uploadFile(path, "screen3"),
            path: join(TEMP_VIDEO_DIR_PATH, path),
          };
        })
        .then(async (data) => {
          await this.db.update(
            { id: body.id, creator: res.locals.user.id },
            { videoThumbnailUrl: data.url }
          );
          return data.path;
        })
        .then((path) => {
          unlinkSync(path);
        })
        .catch((e) => {
          console.error(e);
        });

      this.videoStorage
        .upload(path)
        .then(async (id) => {
          return { video: await this.videoStorage.transcode(id), path };
        })
        .then(async (data) => {
          await this.db.update(
            { id: body.id, creator: res.locals.user.id },
            {
              storageId: data.video.id,
              url: data.video.playback_uri,
            }
          );

          return data.path;
        })
        .then((path) => {
          unlinkSync(path);
        })
        .catch((e) => {
          console.error(e);
        });

      return res.status(StatusCodes.ACCEPTED).json({ message: "processing" });
    };
  }
}

export interface VideoUpdateInput {
  spaceId?: string;
  title?: string;
  bucket?: string;
  storageId?: string;
  duration?: number;
  transcription?: {
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
  }[];
  summary?: string;
  description?: string;
  url?: string;
  videoThumbnailUrl?: string;
  imageThumbnailUrl?: string;
}

export interface UserVideoUploadDB {
  update(
    query: { id: string; creator: string },
    input: VideoUpdateInput
  ): Promise<Video>;
}
