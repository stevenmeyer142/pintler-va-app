import type { Schema } from "../../data/resource"
import {deleteBucketAndObjects} from './delete_bucket_aws_s3';

// TODO: add error handling to result.
export const handler: Schema["deleteBucket"]["functionHandler"] = async (event: any) => {
  // arguments typed from `.arguments()`
  const { bucket_name } = event.arguments
  // return typed from `.returns()`
  try {
    console.log("Calling deleteBucket with arguments:", event.arguments);
    if (!bucket_name) {
      console.error("bucket_name is required");
      return "bucket_name is required";
    }
    await deleteBucketAndObjects(bucket_name);
    return `Bucket ${bucket_name} deleted successfully`;
  }
  catch (error) {
    console.error("Error deleting bucket:", error);
    return `Error deleting bucket: ${error}`;
  }
}