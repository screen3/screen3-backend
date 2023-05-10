import { model, Schema, Types } from "mongoose";
import {
  Collaborations,
  SimpleVideo,
  Video,
} from "../../controllers/user/video";

export interface VideoInterface {
  readonly id: string;
  readonly createdAt: Date;
  spaceId?: string;
  creatorId: string;
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
    spaces: { id: Types.ObjectId; name: string }[];
    users: { id: Types.ObjectId; name: string }[];
    emails: string[];
    guests: Collaborations;
  };
  toVideo(): Video;
  toSimpleVideo(): SimpleVideo;
}

const schema = new Schema<VideoInterface>(
  {
    spaceId: String,
    creatorId: String,
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
      spaces: [{ id: Types.ObjectId, name: String }],
      users: [{ id: Types.ObjectId, name: String }],
      emails: [String],
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
          creatorId: this.creatorId,
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
            })),
            users: this.collaborators.users.map((user) => ({
              id: user.id.toString(),
              name: user.name,
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
