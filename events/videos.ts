import { Video } from "../controllers/user/video";

export class VideoStored {
  video: Video;

  constructor(video: Video) {
    this.video = video;
  }
}
