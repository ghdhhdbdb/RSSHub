import { Api, TelegramClient } from 'telegram';
import { UserAuthParams } from 'telegram/client/auth';
import { StringSession } from 'telegram/sessions';
import { getAppropriatedPartSize } from 'telegram/Utils';

import { config } from '@/config';
import ConfigNotFoundError from '@/errors/types/config-not-found';

let client: TelegramClient | undefined;
export async function getClient(authParams?: UserAuthParams, session?: string) {
    if (!config.telegram.session && session === undefined) {
        throw new ConfigNotFoundError('TELEGRAM_SESSION is not configured');
    }
    if (client) {
        return client;
    }
    const apiId = Number(config.telegram.apiId ?? 4);
    const apiHash = config.telegram.apiHash ?? '014b35b6184100b085b0d0572f9b5103';

    const stringSession = new StringSession(session ?? config.telegram.session);
    client = new TelegramClient(stringSession, apiId, apiHash, {
        connectionRetries: Infinity,
        autoReconnect: true,
        retryDelay: 3000,
        maxConcurrentDownloads: Number(config.telegram.maxConcurrentDownloads ?? 10),
        proxy:
            config.telegram.proxy?.host && config.telegram.proxy.port && config.telegram.proxy.secret
                ? {
                      ip: config.telegram.proxy.host,
                      port: Number(config.telegram.proxy.port),
                      MTProxy: true,
                      secret: config.telegram.proxy.secret,
                  }
                : undefined,
    });

    await client.connect();
    return client;
}

function humanFileSize(size) {
    const i = size === 0 ? 0 : Math.floor(Math.log(size) / Math.log(1024));
    return (size / Math.pow(1024, i)).toFixed(2) * 1 + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
}

/**
 * https://core.telegram.org/api/files#stripped-thumbnails
 * @param bytes Buffer
 * @returns Buffer jpeg
 */
function ExpandInlineBytes(bytes) {
    if (bytes.length < 3 || bytes[0] !== 0x1) {
        return [];
    }
    const header = Buffer.from([
        0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x28, 0x1c, 0x1e, 0x23, 0x1e, 0x19, 0x28, 0x23, 0x21, 0x23, 0x2d, 0x2b,
        0x28, 0x30, 0x3c, 0x64, 0x41, 0x3c, 0x37, 0x37, 0x3c, 0x7b, 0x58, 0x5d, 0x49, 0x64, 0x91, 0x80, 0x99, 0x96, 0x8f, 0x80, 0x8c, 0x8a, 0xa0, 0xb4, 0xe6, 0xc3, 0xa0, 0xaa, 0xda, 0xad, 0x8a, 0x8c, 0xc8, 0xff, 0xcb, 0xda, 0xee,
        0xf5, 0xff, 0xff, 0xff, 0x9b, 0xc1, 0xff, 0xff, 0xff, 0xfa, 0xff, 0xe6, 0xfd, 0xff, 0xf8, 0xff, 0xdb, 0x00, 0x43, 0x01, 0x2b, 0x2d, 0x2d, 0x3c, 0x35, 0x3c, 0x76, 0x41, 0x41, 0x76, 0xf8, 0xa5, 0x8c, 0xa5, 0xf8, 0xf8, 0xf8,
        0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8,
        0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xf8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x00, 0x00, 0x00, 0x03, 0x01, 0x22, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05,
        0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xc4, 0x00, 0xb5, 0x10, 0x00, 0x02, 0x01, 0x03, 0x03, 0x02, 0x04,
        0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7d, 0x01, 0x02, 0x03, 0x00, 0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06, 0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32, 0x81, 0x91, 0xa1, 0x08, 0x23, 0x42, 0xb1, 0xc1,
        0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72, 0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a,
        0x53, 0x54, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x92, 0x93, 0x94, 0x95, 0x96,
        0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7,
        0xd8, 0xd9, 0xda, 0xe1, 0xe2, 0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa, 0xff, 0xc4, 0x00, 0x1f, 0x01, 0x00, 0x03, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01, 0x01,
        0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xc4, 0x00, 0xb5, 0x11, 0x00, 0x02, 0x01, 0x02, 0x04, 0x04, 0x03, 0x04, 0x07, 0x05, 0x04, 0x04, 0x00,
        0x01, 0x02, 0x77, 0x00, 0x01, 0x02, 0x03, 0x11, 0x04, 0x05, 0x21, 0x31, 0x06, 0x12, 0x41, 0x51, 0x07, 0x61, 0x71, 0x13, 0x22, 0x32, 0x81, 0x08, 0x14, 0x42, 0x91, 0xa1, 0xb1, 0xc1, 0x09, 0x23, 0x33, 0x52, 0xf0, 0x15, 0x62,
        0x72, 0xd1, 0x0a, 0x16, 0x24, 0x34, 0xe1, 0x25, 0xf1, 0x17, 0x18, 0x19, 0x1a, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55, 0x56, 0x57,
        0x58, 0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75, 0x76, 0x77, 0x78, 0x79, 0x7a, 0x82, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x92, 0x93, 0x94, 0x95, 0x96, 0x97, 0x98, 0x99, 0x9a,
        0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2, 0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9, 0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe2,
        0xe3, 0xe4, 0xe5, 0xe6, 0xe7, 0xe8, 0xe9, 0xea, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa, 0xff, 0xda, 0x00, 0x0c, 0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3f, 0x00,
    ]);
    const footer = Buffer.from([0xff, 0xd9]);
    const real = Buffer.alloc(header.length + bytes.length + footer.length);
    header.copy(real);
    bytes.copy(real, header.length, 3);
    bytes.copy(real, 164, 1, 2);
    bytes.copy(real, 166, 2, 3);
    footer.copy(real, header.length + bytes.length, 0);
    return real;
}

function getMediaLink(ctx, channel: Api.InputPeerChannel, channelName: string, message: Api.Message) {
    const base = `${ctx.protocol}://${ctx.host}/telegram/channel/${channelName}`;
    const src = base + `${channel.channelId}_${message.id}`;

    const x = message.media;
    if (x instanceof Api.MessageMediaPhoto || (x instanceof Api.MessageMediaDocument && x.document.mimeType.startsWith('image/'))) {
        return `<img src="${src}" alt=""/>`;
    }
    if (x instanceof Api.MessageMediaDocument && x.document.mimeType.startsWith('video/')) {
        const vid = x.document.attributes.find((t) => t.className === 'DocumentAttributeVideo') ?? { w: 1080, h: 720 };
        return `<video controls preload="metadata" poster="${src}?thumb" width="${vid.w / 2}" height="${vid.h / 2}"><source src="${src}" type="${x.document.mimeType}"></video>`;
    }
    if (x instanceof Api.MessageMediaDocument && x.document.mimeType.startsWith('audio/')) {
        return `<audio src="${src}"></audio>`;
    }

    let linkText = getFilename(x);
    if (x instanceof Api.MessageMediaDocument) {
        linkText += ` (${humanFileSize(x.document.size)})`;
        return `<a href="${src}" target="_blank"><img src="${src}?thumb" alt=""/><br/>${linkText}</a>`;
    }
    return '';
}
function getFilename(x) {
    if (x instanceof Api.MessageMediaDocument) {
        const docFilename = x.document.attributes.find((a) => a.className === 'DocumentAttributeFilename');
        if (docFilename) {
            return docFilename.fileName;
        }
    }
    return x.className;
}

function sortThumb(thumb) {
    if (thumb instanceof Api.PhotoStrippedSize) {
        return thumb.bytes.length;
    }
    if (thumb instanceof Api.PhotoCachedSize) {
        return thumb.bytes.length;
    }
    if (thumb instanceof Api.PhotoSize) {
        return thumb.size;
    }
    if (thumb instanceof Api.PhotoSizeProgressive) {
        return Math.max(...thumb.sizes);
    }
    if (thumb instanceof Api.VideoSize) {
        return thumb.size;
    }
    return 0;
}

function chooseLargestThumb(thumbs) {
    thumbs = [...thumbs].sort((a, b) => sortThumb(a) - sortThumb(b));
    return thumbs.pop();
}

function streamThumbnail(x) {
    if (x instanceof Api.MessageMediaDocument && x.document.thumbs.length > 0) {
        const size = chooseLargestThumb(x.document.thumbs);
        if (size instanceof Api.PhotoCachedSize || size instanceof Api.PhotoStrippedSize) {
            return (function* () {
                yield ExpandInlineBytes(size.bytes);
            })();
        }
        return streamDocument(x.document, size && 'type' in size ? size.type : '');
    }
    throw 'not supported';
}

async function decodeMedia(channelName, x, retry = false) {
    const [channel, msg] = x.split('_');

    try {
        const msgs = await client.getMessages(channel, {
            ids: [Number(msg)],
        });
        return msgs[0]?.media;
    } catch (error) {
        if (!retry) {
            // channel likely not seen before, we need to resolve ID and retry
            await client.getInputEntity(channelName);
            return decodeMedia(channelName, x, true);
        }
        throw error;
    }
}

function streamDocument(obj, thumbSize = '', offset, limit) {
    const chunkSize = (obj.size ? getAppropriatedPartSize(obj.size) : 64) * 1024;
    const iterFileParams = {
        file: new Api.InputDocumentFileLocation({
            id: obj.id,
            accessHash: obj.accessHash,
            fileReference: obj.fileReference,
            thumbSize,
        }),
        chunkSize,
        dcId: obj.dcId,
    };
    if (offset) {
        iterFileParams.offset = offset;
    }
    if (limit) {
        iterFileParams.limit = limit;
    }
    return client.iterDownload(iterFileParams);
}

export { client, getMediaLink, decodeMedia, getFilename, streamDocument, streamThumbnail };
