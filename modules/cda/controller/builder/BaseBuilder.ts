import { IID, ICode, IConfidentialityCode, ILanguageCode, ISetId } from '../class/interfaces';
import { CDA } from '../class/CDA';
import * as builder from 'xmlbuilder';
import { PatientBuilder } from './PatientBuilder';
import { AuthorBuilder } from './AuthorBuilder';
import { OrganizationBuilder } from './OrganizationBuilder';

export class BaseBuilder {

    public createNode(root, tag, attrs, text = null) {
        if (attrs) {
            return root.ele(tag, attrs);
        } else if (text) {
            return root.ele(tag, {}, text);
        }
    }

    public fromDate(date: Date) {
        return '' + date.getFullYear() + date.getMonth() + date.getDay() + date.getHours() + date.getMinutes() + date.getSeconds();
    }

}
