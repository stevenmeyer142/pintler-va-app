import type { Schema } from "../../data/resource"
import express from 'express';

export const handler: Schema["sayHello"]["functionHandler"] = async (event) => {
  const app = express();
  // arguments typed from `.arguments()`
  const { name } = event.arguments
  // return typed from `.returns()`
  return `Hello, ${name}! express created`
} 