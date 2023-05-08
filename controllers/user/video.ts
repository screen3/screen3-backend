import { Express, Request, RequestHandler, Response, Router } from "express";
import Validator from "../../app/validator";
import { EventEmitter } from "../../app/event";
import { StatusCodes } from "http-status-codes";
import { VideoStored } from "../../events/videos";
import { VideoCategory } from "../../constants/video";
import { AuthMiddleware } from "../../app/jwtAuthenticator";
import { UserTypes } from "../../constants/user";

export default class UserVideoController {
  private readonly router = Router();
  private readonly validator = new Validator();
  private readonly db: UserVideoDB;
  private readonly emitter: EventEmitter;
  private authenticator: AuthMiddleware;
  constructor(
    db: UserVideoDB,
    emitter: EventEmitter,
    authenticator: AuthMiddleware
  ) {
    this.db = db;
    this.emitter = emitter;
    this.authenticator = authenticator;
  }
  registerRoutes(express: Express) {
    express.post(
      "video/save",
      this.authenticator.middleware(UserTypes.USER),
      this.store()
    );
    express.get(
      "video/list",
      this.authenticator.middleware(UserTypes.USER),
      this.list()
    );
    express.get(
      "video/:id",
      this.authenticator.middleware(UserTypes.USER),
      this.show()
    );
  }
  private store(): RequestHandler {
    return async (
      req: Request<
        any,
        any,
        {
          spaceId?: string;
          title?: string;
          bucket?: string;
          storageId?: string;
          description?: string;
          duration?: string;
          url?: string;
          videoThumbnailUrl?: string;
          imageThumbnail?: { smallUrl: string; largeUrl: string };
          tags: { id: string; title: string; color: string }[];
        }
      >,
      res: Response
    ) => {
      const body = req.body;
      try {
        await this.validator.validate(
          {
            spaceId: this.validator.string(),
            title: this.validator.string(),
            bucket: this.validator.string(),
            storageId: this.validator.string().required(),
            description: this.validator.string(),
            duration: this.validator.string(),
            url: this.validator.string().uri(),
            videoThumbnailUrl: this.validator.string().uri(),
            imageThumbnail: this.validator.object().keys({
              smallUrl: this.validator.string().uri(),
              largeUrl: this.validator.string().uri(),
            }),
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

      try {
        const video = await this.db.store(body);
        this.emitter.emit(new VideoStored(video));
        return res.status(StatusCodes.CREATED).json(video);
      } catch (e) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR);
      }
    };
  }
  private list(): RequestHandler {
    return async (
      req: Request<
        any,
        any,
        any,
        {
          category?: VideoCategory;
          date?: { start: string; end: string };
          tags?: string[];
        }
      >,
      res: Response
    ) => {
      const query = req.query;
      const input: VideosListInput = {
        tags: query.tags,
        date: query.date,
        creator: res.locals.user.id,
      };
      let videos;
      if (query?.category === VideoCategory.SHARED) {
        input.users = [res.locals.user.id];
        input.email = [res.locals.user.email];
        input.spaces = res.locals.user.spaces?.map(
          (space: { id: string }) => space.id
        );

        videos = await this.db.findVideosSharedWithMe(input);
      } else {
        videos = await this.db.findMyVideos(input);
      }

      return res.json(videos);
    };
  }
  private show(): RequestHandler {
    return async (req: Request<{ id?: string }>, res: Response) => {
      const video = await this.db.show({
        id: req.params.id as string,
        access: {
          creator: [res.locals.user.id],
          users: [res.locals.user.id],
          email: [res.locals.user.email],
          spaces: res.locals.user.spaces?.map(
            (space: { id: string }) => space.id
          ),
        },
      });

      return res.json(video);
    };
  }
}

export interface Video {
  id?: string;
  spaceId?: string;
  creatorId: string;
  bucket?: string;
  storageId?: string;
  title?: string;
  description?: string;
  commentsCount: number;
  tags: { id: string; title: string; color: string }[];
  duration: number;
  imageThumbnail?: { smallUrl: string; largeUrl: string };
  url?: string;
  videoThumbnailUrl?: string;
  summary?: string;
  collaborators: {
    spaces: { id: string; name: string }[];
    users: { id: string; name: string }[];
    emails: string[];
  };
  createdAt: Date;
}

export interface SimpleVideo {
  id: string;
  title?: string;
  bucket?: string;
  storageId?: string;
  description?: string;
  videoThumbnailUrl?: string;
  url?: string;
  duration?: number;
  createdAt: Date;
}

export interface UserVideoDB {
  store(input: VideoInput): Promise<Video>;

  findVideosSharedWithMe(input: VideosListInput): Promise<SimpleVideo[]>;

  show(input: VideosShowInput): Promise<Video>;

  findMyVideos(input: VideosListInput): Promise<SimpleVideo[]>;
}

export interface VideoInput {
  spaceId?: string;
  title?: string;
  bucket?: string;
  storageId?: string;
  description?: string;
  url?: string;
  videoThumbnailUrl?: string;
  imageThumbnail?: { smallUrl: string; largeUrl: string };
  tags: { id: string; title: string; color: string }[];
}

export interface VideosListInput {
  users?: string[];
  creator: string;
  email?: string[];
  spaces?: string[];
  date?: { start: string; end: string };
  tags?: string[];
}
export interface VideosShowInput {
  id: string;
  access?: {
    users?: string[];
    creator?: string[];
    email?: string[];
    spaces?: string[];
  };
}
