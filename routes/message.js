import { Router } from "express";
import {
  addMessage,
  deleteMessage,
  getMessage,
  getMessages,
  updateMessage,
} from "../controllers/message.js";
import { checkTeacherRole } from "../middleware/role.js";

const router = Router();

router.post("/", checkTeacherRole, addMessage);
router.get("/:id", checkTeacherRole, getMessage);
router.get("/", getMessages);
router.put("/:id", checkTeacherRole, updateMessage);
router.delete("/:id", checkTeacherRole, deleteMessage);

export default router;
