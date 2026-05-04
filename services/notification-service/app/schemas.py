from pydantic import BaseModel, EmailStr


class SendEmailRequest(BaseModel):
    email: EmailStr
    subject: str
    message: str
