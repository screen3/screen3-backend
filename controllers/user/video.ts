import { Express, Request, RequestHandler, Response } from "express";
import Validator from "../../app/validator";
import { EventEmitter } from "../../app/event";
import { StatusCodes } from "http-status-codes";
import { VideoStored } from "../../events/videos";
import { VideoCategory } from "../../constants/video";
import { AuthMiddleware } from "../../app/jwtAuthenticator";
import { UserTypes } from "../../constants/user";
import { ERROR_NOT_FOUND } from "../../constants/errors";
import { VideoUpdateInput } from "./videoUpload";

export default class UserVideoController {
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
      "/video/save",
      this.authenticator.middleware(UserTypes.USER),
      this.store()
    );
    express.patch(
      "/video/:id",
      this.authenticator.middleware(UserTypes.USER),
      this.update()
    );
    express.get(
      "/video/list",
      this.authenticator.middleware(UserTypes.USER),
      this.list()
    );
    express.get(
      "/video/:id",
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
          duration?: number;
          url?: string;
          videoThumbnailUrl?: string;
          imageThumbnailUrl?: string;
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
            imageThumbnailUrl: this.validator.string().uri(),
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
        const video = await this.db.store({
          ...body,
          duration: body.duration as number,
          creator: {
            id: res.locals.user.id,
            name: res.locals.user.fullName,
          },
          collaborators: {
            guests: "view",
          },
        });
        this.emitter.emit(new VideoStored(video));
        return res.status(StatusCodes.CREATED).json(video);
      } catch (e) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR);
      }
    };
  }
  private update(): RequestHandler {
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
          duration?: number;
          url?: string;
          videoThumbnailUrl?: string;
          imageThumbnailUrl?: string;
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
            storageId: this.validator.string(),
            description: this.validator.string(),
            duration: this.validator.string(),
            url: this.validator.string().uri(),
            videoThumbnailUrl: this.validator.string().uri(),
            imageThumbnailUrl: this.validator.string().uri(),
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
        const video = await this.db.update({ id: req.params.id, creator: res.locals.user.id }, body);
        // this.emitter.emit(new VideoStored(video));
        return res.status(StatusCodes.OK).json(video);
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
        input.emails = [res.locals.user.email];
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
      try {
        const video = await this.db.show({
          id: req.params.id as string,
          access: {
            creator: [res.locals.user.id],
            users: [res.locals.user.id],
            emails: [res.locals.user.email],
            spaces: res.locals.user.spaces?.map(
              (space: { id: string }) => space.id
            ),
          },
        });
        return res.json(video);
      } catch (e) {
        console.log(e);
        if (e === ERROR_NOT_FOUND) {
          return res.status(StatusCodes.NOT_FOUND);
        }
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR);
      }
    };
  }
}

export interface Video {
  id?: string;
  spaceId?: string;
  creator: { id: string; name: string };
  bucket?: string;
  storageId?: string;
  title?: string;
  description?: string;
  commentsCount: number;
  tags: { id: string; title: string; color: string }[];
  duration: number;
  imageThumbnailUrl?: string;
  url?: string;
  videoThumbnailUrl?: string;
  summary?: string;
  transcription?: {
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
  }[];
  collaborators: {
    spaces: { id: string; name: string; access: CollaboratorAccess }[];
    users: { id: string; name: string; access: CollaboratorAccess }[];
    emails: { email: string; access: CollaboratorAccess }[];
    guests: CollaboratorAccess;
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
  imageThumbnailUrl?: string;
  url?: string;
  duration?: number;
  createdAt: Date;
}

export interface UserVideoDB {
  store(input: VideoStoreInput): Promise<Video>;

  findVideosSharedWithMe(input: VideosListInput): Promise<SimpleVideo[]>;

  show(input: VideosShowInput): Promise<Video>;

  findMyVideos(input: VideosListInput): Promise<SimpleVideo[]>;

  update(
    query: { id: string; creator: string },
    input: VideoUpdateInput
  ): Promise<Video>;
}

export interface VideoStoreInput {
  spaceId?: string;
  title?: string;
  bucket?: string;
  storageId?: string;
  duration?: number;
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

export interface VideosListInput {
  users?: string[];
  creator: string;
  emails?: string[];
  spaces?: string[];
  date?: { start: string; end: string };
  tags?: string[];
}
export interface VideosShowInput {
  id: string;
  access?: {
    users?: string[];
    creator?: string[];
    emails?: string[];
    spaces?: string[];
  };
}

export type CollaboratorAccess = "comment" | "view" | "none";
