FROM node:16 as base

WORKDIR /backend

COPY package.json .
COPY package-lock.json .

RUN npm install

COPY . .
RUN mkdir -p resources/tmp/videos
RUN mkdir -p resources/tmp/thumbnails
RUN mkdir -p resources/uploads

FROM base as dev

CMD npm run dev

FROM base as production

RUN npm run build
CMD npm start

