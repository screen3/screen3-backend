import { Express, Request, RequestHandler, Response } from "express";
import multer from "multer";
import Validator from "../../app/validator";
import { EventEmitter } from "../../app/event";
import { StatusCodes } from "http-status-codes";
import { VideoStored } from "../../events/videos";
import { AuthMiddleware } from "../../app/jwtAuthenticator";
import { UserTypes } from "../../constants/user";
import VideoProcessor from "../../utilities/videoProcessor";
import ThetaUploader from "../../utilities/thetaUploader";
import { unlink } from "fs";
import { CollaboratorAccess, Video } from "./video";
import { basePath } from "../../utilities/file";
import { v4 as uuid } from "uuid";

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
  private readonly cloudStorage: ThetaUploader;
  constructor(
    db: UserVideoUploadDB,
    emitter: EventEmitter,
    authenticator: AuthMiddleware,
    videoProcessor: VideoProcessor,
    uploader: ThetaUploader
  ) {
    this.db = db;
    this.emitter = emitter;
    this.authenticator = authenticator;
    this.videoProcessor = videoProcessor;
    this.cloudStorage = uploader;
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
            spaceId: this.validator.string(),
            title: this.validator.string(),
            description: this.validator.string(),
            video: this.validator.string().required(),
            tags: this.validator.array().items(
              this.validator.object().keys({
                id: this.validator.string(),
                title: this.validator.string(),
                color: this.validator.string().regex(/^#[A-Fa-f0-9]{6}/),
              })
            ),
          },
          body
        );
      } catch (e) {
        return res.status(StatusCodes.UNPROCESSABLE_ENTITY).json(e);
      }

      const path = basePath(body.video);
      const thumbnailPath = await this.videoProcessor.getVideoThumbnail(path);
      const { duration } = await this.videoProcessor.getMetadata(path);
      const thumbnail = await this.cloudStorage.uploadAndTranscode(
        thumbnailPath,
        () => {
          unlink(thumbnailPath, (err) => {
            console.log(err);
          });
        }
      );

      const video = await this.cloudStorage.uploadAndTranscode(path, () => {
        unlink(path, (err) => {
          console.log(err);
        });
      });

      try {
        const dbVideo = await this.db.store({
          description: req.body.description,
          storageId: video.id,
          tags: [],
          title: req.body.title,
          url: video.playback_uri,
          videoThumbnailUrl: thumbnail.playback_uri,
          duration: duration as number,
          creator: {
            id: res.locals.user.id,
            name: res.locals.user.fullName,
          },
          collaborators: {
            guests: "view",
          },
        });
        this.emitter.emit(new VideoStored(dbVideo));
        return res.status(StatusCodes.CREATED).json(dbVideo);
      } catch (e) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR);
      }
    };
  }
}

export interface UserVideoUploadDB {
  store(input: VideoStoreInput): Promise<Video>;
}

export interface VideoStoreInput {
  spaceId?: string;
  title?: string;
  bucket?: string;
  storageId?: string;
  duration: number;
  creator: { id: string; name: string };
  description?: string;
  url?: string;
  videoThumbnailUrl?: string;
  imageThumbnail?: { smallUrl: string; largeUrl: string };
  tags: { id: string; title: string; color: string }[];
  collaborators: {
    guests?: CollaboratorAccess;
  };
}
