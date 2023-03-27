import Joi from "joi";

const signUpBodyValidation = (body) => {
  const schema = Joi.object({
    name: Joi.string().min(3).required().label("Name"),
    email: Joi.string().email().required().label("Email"),
    password: Joi.string().min(6).required().label("Password"),
  });
  return schema.validate(body);
};

const logInBodyValidation = (body) => {
  const schema = Joi.object({
    email: Joi.string().email().required().label("Email"),
    password: Joi.string().min(6).required().label("Password"),
  });
  return schema.validate(body);
};

export { signUpBodyValidation, logInBodyValidation };
