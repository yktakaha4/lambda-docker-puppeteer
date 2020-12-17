FROM public.ecr.aws/lambda/nodejs:12 AS builder

WORKDIR /opt/build

COPY . .

RUN npm ci

RUN npm run build

##### ##### ##### #####
FROM public.ecr.aws/lambda/nodejs:12 AS runner

RUN curl -sOL https://dl.google.com/linux/direct/google-chrome-stable_current_x86_64.rpm \
  && yum localinstall -y google-chrome-stable_current_x86_64.rpm \
  && rm -f google-chrome-stable_current_x86_64.rpm

COPY --from=builder \
  /opt/build/package*.json \
  ./

COPY --from=builder \
  /opt/build/dist \
  ./dist

RUN PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm ci --only=production

CMD ["dist/index.handler"]
