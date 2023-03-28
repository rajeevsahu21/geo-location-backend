import { Router } from "express";
import {
  addMessage,
  deleteMessage,
  getMessage,
  getMessages,
  updateMessage,
} from "../controllers/message.js";

const router = Router();

router.post("/", addMessage);
router.get("/:id", getMessage);
router.get("/", getMessages);
router.put("/:id", updateMessage);
router.delete("/:id", deleteMessage);

export default router;
