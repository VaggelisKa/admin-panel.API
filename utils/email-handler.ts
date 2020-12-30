import { config } from "../dependencies/dotenv-deps.ts";

const { 
    SENDGRID_API_ENDPOINT,
    SENDGRIP_API_KEY 
} = config();

export const sendEmail = async (email: string, subject: string, html: string) => {
    const message = {
        personalizations: [
          {
            to: [
              {
                email: email
              }
            ],
            subject
          }
        ],
        from: {
          email: "e.karavasileiadis@gmail.com"
        },
        content: [
          {
            type: "text/html",
            value: html
          }
        ]
      }

    const response = await fetch(SENDGRID_API_ENDPOINT, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${SENDGRIP_API_KEY}`,
            "Content-Type": 'application/json'
        },
        body: JSON.stringify(message)
    });

    return response;
}