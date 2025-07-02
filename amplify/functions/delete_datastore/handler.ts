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
      return JSON.stringify({ success: false, message: "bucket_name is required" });
    }
    await deleteBucketAndObjects(bucket_name);
    return JSON.stringify({ success: true, message: `Bucket ${bucket_name} deleted successfully` });
  }
  catch (error: any) {
    console.error("Error deleting bucket:", error);
    return JSON.stringify({ success: false, message: `Error deleting bucket: ${error.message}` });
  }
}