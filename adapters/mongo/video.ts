import {
  SimpleVideo,
  UserVideoDB,
  Video,
  VideosListInput,
  VideosShowInput,
} from "../../controllers/user/video";
import VideoModel from "../../database/models/video";
import { ERROR_NOT_FOUND } from "../../constants/errors";
import {
  UserVideoUploadDB,
  VideoStoreInput,
} from "../../controllers/user/videoUpload";

export class MongoVideo implements UserVideoDB, UserVideoUploadDB {
  async findMyVideos(input: VideosListInput): Promise<SimpleVideo[]> {
    const query: Record<string, any> = {
      "creator.id": input.creator,
    };
    if (input.tags) query["tags.id"] = { $in: input.tags };
    if (input.date) query.date = this.dateQuery(input.date);

    return await this.find(query);
  }

  async findVideosSharedWithMe(input: VideosListInput): Promise<SimpleVideo[]> {
    const query: Record<string, any> = {
      "creator.id": { $ne: input.creator },
      $or: [],
    };

    if (input.tags) query["tags.id"] = { $in: input.tags };
    if (input.date) query.date = this.dateQuery(input.date);
    if (input?.users) query.$or.push({ "users.id": { $in: input.users } });
    if (input?.spaces) query.$or.push({ "spaces.id": { $in: input.spaces } });
    if (input?.emails)
      query.$or.push({ "emails.email": { $in: input.emails } });

    return await this.find(query);
  }

  async show(input: VideosShowInput): Promise<Video> {
    const access = input.access;
    const query: Record<string, any> = { $or: [], _id: input.id };

    if (access?.creator)
      query.$or.push({
        "creator.id": {
          $in: access.creator,
        },
      });
    if (access?.users)
      query.$or.push({
        "users.id": {
          $in: access.users,
        },
      });
    if (access?.spaces)
      query.$or.push({
        "spaces.id": {
          $in: access.spaces,
        },
      });
    if (access?.emails)
      query.$or.push({ "emails.email": { $in: access.emails } });

    const doc = await VideoModel.findOne(query);
    if (!doc) throw ERROR_NOT_FOUND;
    return doc.toVideo();
  }

  async store(input: VideoStoreInput): Promise<Video> {
    input.url =
      input.url ??
      `https://media.thetavideoapi.com/${input.storageId}/master.m3u8`;
    const doc = await VideoModel.create(input);
    return doc.toVideo();
  }

  private dateQuery(date: { start: string; end: string } | undefined) {
    let result = {};
    if (date && date.start && date.end) {
      result = {
        $lte: new Date(date.end),
        $gte: new Date(date.start),
      };
    } else if (date && date.start && !date.end) {
      result = { $gte: new Date(date.start) };
    } else if (date && !date.start && date.end) {
      result = { $lte: new Date(date.end) };
    }
    return result;
  }

  private async find(query: Record<string, any>) {
    const docs = await VideoModel.find(query, [
      "id",
      "url",
      "title",
      "storageId",
      "bucket",
      "description",
      "videoThumbnailUrl",
      "duration",
      "createdAt",
    ]);
    return docs.map((doc) => doc.toSimpleVideo());
  }
}
