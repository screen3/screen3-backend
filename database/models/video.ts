import { model, Schema, Types } from "mongoose";
import {
  CollaboratorAccess,
  SimpleVideo,
  Video,
} from "../../controllers/user/video";

export interface VideoInterface {
  readonly id: string;
  readonly createdAt: Date;
  spaceId?: string;
  creator: { id: Types.ObjectId; name: string };
  bucket?: string;
  storageId?: string;
  title?: string;
  description?: string;
  nftCollection?: string;
  transcription?: {
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
  }[];
  commentsCount: number;
  tags: { id: Types.ObjectId; title: string; color: string }[];
  duration: number;
  imageThumbnailUrl?: string;
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
    nftCollection: String,
    commentsCount: Number,
    tags: [{ id: Types.ObjectId, title: String, color: String }],
    duration: Number,
    imageThumbnailUrl: String,
    url: String,
    videoThumbnailUrl: String,
    transcription: [
      { id: Number, seek: Number, start: Number, end: Number, text: String },
    ],
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
          nftCollection: this.nftCollection,
          commentsCount: this.commentsCount,
          tags: this.tags.map((tag) => ({
            id: tag.id.toString(),
            title: tag.title,
            color: tag.color,
          })),
          duration: this.duration,
          imageThumbnailUrl: this.imageThumbnailUrl,
          url: this.url,
          videoThumbnailUrl: this.videoThumbnailUrl,
          summary: this.summary,
          transcription: this.transcription,
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
          imageThumbnailUrl: this.imageThumbnailUrl,
          duration: this.duration,
          nftCollection: this.nftCollection,
        };
      },
    },
  }
);

const Video = model<VideoInterface>("Video", schema);

export default Video;
