FROM public.ecr.aws/lambda/nodejs:12 AS builder

WORKDIR /opt/build

COPY . .

RUN npm ci

RUN npm run build

##### ##### ##### #####
FROM public.ecr.aws/lambda/nodejs:12 AS runner

COPY --from=builder \
  /opt/build/package*.json \
  ./

COPY --from=builder \
  /opt/build/dist \
  ./dist

RUN npm ci --only=production

CMD ["dist/index.handler"]
