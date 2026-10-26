FROM node:alpine

WORKDIR /app

COPY . .

RUN ["npm","install","--force"]

RUN [ "npm","run","build" ]

CMD [ "npm","start" ]