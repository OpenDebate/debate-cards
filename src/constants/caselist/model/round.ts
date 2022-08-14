/**
 * Caselist API v1
 * No description provided (generated by Openapi Generator https://github.com/openapitools/openapi-generator)
 *
 * The version of the OpenAPI document: 1.0.0
 * 
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { RequestFile } from './models';

export class Round {
    'roundId'?: number;
    'teamId'?: number;
    'side'?: string;
    'tournament'?: string;
    'round'?: string;
    'opponent'?: string | null;
    'judge'?: string | null;
    'report'?: string | null;
    'opensource'?: string | null;
    'video'?: string | null;
    'tournId'?: number | null;
    'externalId'?: number | null;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
        {
            "name": "roundId",
            "baseName": "round_id",
            "type": "number"
        },
        {
            "name": "teamId",
            "baseName": "team_id",
            "type": "number"
        },
        {
            "name": "side",
            "baseName": "side",
            "type": "string"
        },
        {
            "name": "tournament",
            "baseName": "tournament",
            "type": "string"
        },
        {
            "name": "round",
            "baseName": "round",
            "type": "string"
        },
        {
            "name": "opponent",
            "baseName": "opponent",
            "type": "string"
        },
        {
            "name": "judge",
            "baseName": "judge",
            "type": "string"
        },
        {
            "name": "report",
            "baseName": "report",
            "type": "string"
        },
        {
            "name": "opensource",
            "baseName": "opensource",
            "type": "string"
        },
        {
            "name": "video",
            "baseName": "video",
            "type": "string"
        },
        {
            "name": "tournId",
            "baseName": "tourn_id",
            "type": "number"
        },
        {
            "name": "externalId",
            "baseName": "external_id",
            "type": "number"
        }    ];

    static getAttributeTypeMap() {
        return Round.attributeTypeMap;
    }
}

