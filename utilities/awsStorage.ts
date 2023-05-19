import AWS from "aws-sdk";
import fs from "fs";
import {
  DO_ACCESS_KEY_ID,
  DO_ACCESS_KEY_SECRET,
  DO_REGION,
} from "../constants/filesystem";
import { join } from "path";

export default class AwsStorage {
  private readonly spacesEndpoint: AWS.Endpoint;
  private readonly s3: AWS.S3;
  private readonly inputDir: string;
  private readonly region: string;

  static initDo(dir: string) {
    return new AwsStorage(
      DO_ACCESS_KEY_ID,
      DO_ACCESS_KEY_SECRET,
      DO_REGION,
      dir
    );
  }

  constructor(
    accessKeyId: string,
    secretAccessKey: string,
    region: string,
    inputDir: string
  ) {
    this.inputDir = inputDir;
    this.region = region;
    this.spacesEndpoint = new AWS.Endpoint(region + ".digitaloceanspaces.com");
    this.s3 = new AWS.S3({
      endpoint: this.spacesEndpoint,
      accessKeyId,
      secretAccessKey,
      region,
    });
  }

  public async uploadFile(
    filePath: string,
    bucketName: string,
    acl: string = "public-read"
  ): Promise<string> {
    const fileStream = fs.createReadStream(join(this.inputDir, filePath));
    const uploadParams: AWS.S3.PutObjectRequest = {
      Bucket: bucketName,
      Key: filePath, // The file name will be used as the key in DigitalOcean Spaces
      Body: fileStream,
      ACL: acl,
    };

    await this.s3.upload(uploadParams).promise();

    return `https://${bucketName}.${this.region}.cdn.digitaloceanspaces.com/${filePath}`;
  }

  public async getPublicUrl(
    bucketName: string,
    filePath: string
  ): Promise<string> {
    return `https://${bucketName}.${this.region}.cdn.digitaloceanspaces.com/${filePath}`;
  }
}
