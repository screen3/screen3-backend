import { model, Schema, Types } from "mongoose";
import {
  CollaboratorAccess,
  SimpleVideo,
  Video,
} from "../../controllers/user/video";
import user from "./user";

export interface VideoInterface {
  readonly id: string;
  readonly createdAt: Date;
  spaceId?: string;
  creator: { id: Types.ObjectId; name: string };
  bucket?: string;
  storageId?: string;
  title?: string;
  description?: string;
  commentsCount: number;
  tags: { id: Types.ObjectId; title: string; color: string }[];
  duration: number;
  imageThumbnail?: { smallUrl: string; largeUrl: string };
  url?: string;
  videoThumbnailUrl?: string;
  summary?: string;
  collaborators: {
    spaces: { id: Types.ObjectId; name: string; access: CollaboratorAccess }[];
    users: { id: Types.ObjectId; name: string; access: CollaboratorAccess }[];
    emails: { email: string; access: CollaboratorAccess }[];
    guests: CollaboratorAccess;
  };
  toVideo(): Video;
  toSimpleVideo(): SimpleVideo;
}

const schema = new Schema<VideoInterface>(
  {
    spaceId: String,
    creator: { id: Types.ObjectId, name: String },
    bucket: String,
    storageId: String,
    title: String,
    description: String,
    commentsCount: Number,
    tags: [{ id: Types.ObjectId, title: String, color: String }],
    duration: Number,
    imageThumbnail: { smallUrl: String, largeUrl: String },
    url: String,
    videoThumbnailUrl: String,
    summary: String,
    collaborators: {
      spaces: [
        {
          id: Types.ObjectId,
          name: String,
          access: { type: String, enum: ["comment", "view", "none"] },
        },
      ],
      users: [
        {
          id: Types.ObjectId,
          name: String,
          access: { type: String, enum: ["comment", "view", "none"] },
        },
      ],
      emails: [
        {
          email: String,
          access: { type: String, enum: ["comment", "view", "none"] },
        },
      ],
      guests: { type: String, enum: ["comment", "view", "none"] },
    },
  },
  {
    timestamps: true,
    methods: {
      toVideo(): Video {
        return {
          id: this._id.toString(),
          createdAt: this.createdAt,
          spaceId: this.spaceId,
          creator: {
            id: this.creator?.id?.toString(),
            name: this.creator.name,
          },
          bucket: this.bucket,
          storageId: this.storageId,
          title: this.title,
          description: this.description,
          commentsCount: this.commentsCount,
          tags: this.tags.map((tag) => ({
            id: tag.id.toString(),
            title: tag.title,
            color: tag.color,
          })),
          duration: this.duration,
          imageThumbnail: this.imageThumbnail
            ? {
                smallUrl: this.imageThumbnail.smallUrl,
                largeUrl: this.imageThumbnail.largeUrl,
              }
            : undefined,
          url: this.url,
          videoThumbnailUrl: this.videoThumbnailUrl,
          summary: this.summary,
          collaborators: {
            spaces: this.collaborators.spaces.map((space) => ({
              id: space.id.toString(),
              name: space.name,
              access: space.access,
            })),
            users: this.collaborators.users.map((user) => ({
              id: user.id.toString(),
              name: user.name,
              access: user.access,
            })),
            emails: this.collaborators.emails,
            guests: this.collaborators.guests,
          },
        };
      },
      toSimpleVideo(): SimpleVideo {
        return {
          bucket: this.bucket,
          createdAt: this.createdAt,
          description: this.description,
          id: this._id.toString(),
          storageId: this.storageId,
          title: this.title,
          url: this.url,
          videoThumbnailUrl: this.videoThumbnailUrl,
          duration: this.duration,
        };
      },
    },
  }
);

const Video = model<VideoInterface>("Video", schema);

export default Video;
