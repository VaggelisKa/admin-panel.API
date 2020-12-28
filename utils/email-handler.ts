import { config } from "https://deno.land/x/dotenv@v2.0.0/mod.ts";

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