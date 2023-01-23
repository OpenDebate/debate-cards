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

export class Recent {
    'teamId': number;
    'side': string;
    'tournament': string;
    'roundId': number;
    'opponent': string;
    'opensource'?: string;
    'teamName': string;
    'teamDisplayName': string;
    'schoolName': string;
    'schoolDisplayName': string;
    'updatedAt': string;

    static discriminator: string | undefined = undefined;

    static attributeTypeMap: Array<{name: string, baseName: string, type: string}> = [
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
            "name": "roundId",
            "baseName": "round_id",
            "type": "number"
        },
        {
            "name": "opponent",
            "baseName": "opponent",
            "type": "string"
        },
        {
            "name": "opensource",
            "baseName": "opensource",
            "type": "string"
        },
        {
            "name": "teamName",
            "baseName": "team_name",
            "type": "string"
        },
        {
            "name": "teamDisplayName",
            "baseName": "team_display_name",
            "type": "string"
        },
        {
            "name": "schoolName",
            "baseName": "school_name",
            "type": "string"
        },
        {
            "name": "schoolDisplayName",
            "baseName": "school_display_name",
            "type": "string"
        },
        {
            "name": "updatedAt",
            "baseName": "updated_at",
            "type": "string"
        }    ];

    static getAttributeTypeMap() {
        return Recent.attributeTypeMap;
    }
}

