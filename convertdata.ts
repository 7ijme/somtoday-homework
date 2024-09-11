// To parse this data:
//
//   import { Convert, Welcome } from "./file";
//
//   const welcome = Convert.toWelcome(json);
//
// These functions will throw an error if the JSON doesn't
// match the expected interface, even if the JSON is valid.

export interface Welcome {
    items: Item[];
}

export interface Item {
    $type:                  Type;
    links:                  Link[];
    permissions:            Permission[];
    additionalObjects:      AdditionalObjects;
    studiewijzerItem:       StudiewijzerItem;
    sortering:              number;
    lesgroep:               Lesgroep;
    datumTijd:              Date;
    aangemaaktOpDatumTijd?: Date;
}

export enum Type {
    InstellingRVestiging = "instelling.RVestiging",
    LesgroepRLesgroep = "lesgroep.RLesgroep",
    OnderwijsinrichtingRSchooljaar = "onderwijsinrichting.RSchooljaar",
    OnderwijsinrichtingRVak = "onderwijsinrichting.RVak",
    StudiewijzerRSWIAfspraakToekenning = "studiewijzer.RSWIAfspraakToekenning",
    StudiewijzerRStudiewijzerItem = "studiewijzer.RStudiewijzerItem",
}

export interface AdditionalObjects {
}

export interface Lesgroep {
    links:                    Link[];
    permissions:              Permission[];
    additionalObjects:        AdditionalObjects;
    UUID:                     string;
    naam:                     string;
    omschrijving:             string;
    schooljaar:               Schooljaar;
    vak:                      Vak;
    heeftStamgroep:           boolean;
    examendossierOndersteund: boolean;
    vestiging:                Vestiging;
}

export interface Link {
    id:   number;
    rel:  Rel;
    type: Type;
    href: string;
}

export enum Rel {
    Self = "self",
}

export interface Permission {
    full:       string;
    type:       Type;
    operations: Operation[];
    instances:  string[];
}

export enum Operation {
    Read = "READ",
}

export interface Schooljaar {
    $type:             Type;
    links:             Link[];
    permissions:       Permission[];
    additionalObjects: AdditionalObjects;
    naam:              SchooljaarNaam;
    vanafDatum:        Date;
    totDatum:          Date;
    isHuidig:          boolean;
}

export enum SchooljaarNaam {
    The20242025 = "2024/2025",
}

export interface Vak {
    links:             Link[];
    permissions:       Permission[];
    additionalObjects: AdditionalObjects;
    afkorting:         string;
    naam:              string;
    UUID:              string;
}

export interface Vestiging {
    links:             Link[];
    permissions:       Permission[];
    additionalObjects: AdditionalObjects;
    naam:              VestigingNaam;
    uuid:              string;
}

export enum VestigingNaam {
    ReviusLyceumDoorn = "Revius Lyceum Doorn",
}

export interface StudiewijzerItem {
    links:                        Link[];
    permissions:                  Permission[];
    additionalObjects:            AdditionalObjects;
    onderwerp:                    string;
    huiswerkType:                 HuiswerkType;
    omschrijving:                 string;
    inleverperiodes:              boolean;
    lesmateriaal:                 boolean;
    projectgroepen:               boolean;
    bijlagen:                     any[];
    externeMaterialen:            any[];
    inlevermomenten:              any[];
    tonen:                        boolean;
    notitieZichtbaarVoorLeerling: boolean;
    leerdoelen:                   string;
}

export enum HuiswerkType {
    Huiswerk = "HUISWERK",
}

// Converts JSON strings to/from your types
// and asserts the results of JSON.parse at runtime
export class Convert {
    public static toWelcome(json: string): Welcome {
        return cast(JSON.parse(json), r("Welcome"));
    }

    public static welcomeToJson(value: Welcome): string {
        return JSON.stringify(uncast(value, r("Welcome")), null, 2);
    }
}

function invalidValue(typ: any, val: any, key: any, parent: any = ''): never {
    const prettyTyp = prettyTypeName(typ);
    const parentText = parent ? ` on ${parent}` : '';
    const keyText = key ? ` for key "${key}"` : '';
    throw Error(`Invalid value${keyText}${parentText}. Expected ${prettyTyp} but got ${JSON.stringify(val)}`);
}

function prettyTypeName(typ: any): string {
    if (Array.isArray(typ)) {
        if (typ.length === 2 && typ[0] === undefined) {
            return `an optional ${prettyTypeName(typ[1])}`;
        } else {
            return `one of [${typ.map(a => { return prettyTypeName(a); }).join(", ")}]`;
        }
    } else if (typeof typ === "object" && typ.literal !== undefined) {
        return typ.literal;
    } else {
        return typeof typ;
    }
}

function jsonToJSProps(typ: any): any {
    if (typ.jsonToJS === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.json] = { key: p.js, typ: p.typ });
        typ.jsonToJS = map;
    }
    return typ.jsonToJS;
}

function jsToJSONProps(typ: any): any {
    if (typ.jsToJSON === undefined) {
        const map: any = {};
        typ.props.forEach((p: any) => map[p.js] = { key: p.json, typ: p.typ });
        typ.jsToJSON = map;
    }
    return typ.jsToJSON;
}

function transform(val: any, typ: any, getProps: any, key: any = '', parent: any = ''): any {
    function transformPrimitive(typ: string, val: any): any {
        if (typeof typ === typeof val) return val;
        return invalidValue(typ, val, key, parent);
    }

    function transformUnion(typs: any[], val: any): any {
        // val must validate against one typ in typs
        const l = typs.length;
        for (let i = 0; i < l; i++) {
            const typ = typs[i];
            try {
                return transform(val, typ, getProps);
            } catch (_) {}
        }
        return invalidValue(typs, val, key, parent);
    }

    function transformEnum(cases: string[], val: any): any {
        if (cases.indexOf(val) !== -1) return val;
        return invalidValue(cases.map(a => { return l(a); }), val, key, parent);
    }

    function transformArray(typ: any, val: any): any {
        // val must be an array with no invalid elements
        if (!Array.isArray(val)) return invalidValue(l("array"), val, key, parent);
        return val.map(el => transform(el, typ, getProps));
    }

    function transformDate(val: any): any {
        if (val === null) {
            return null;
        }
        const d = new Date(val);
        if (isNaN(d.valueOf())) {
            return invalidValue(l("Date"), val, key, parent);
        }
        return d;
    }

    function transformObject(props: { [k: string]: any }, additional: any, val: any): any {
        if (val === null || typeof val !== "object" || Array.isArray(val)) {
            return invalidValue(l(ref || "object"), val, key, parent);
        }
        const result: any = {};
        Object.getOwnPropertyNames(props).forEach(key => {
            const prop = props[key];
            const v = Object.prototype.hasOwnProperty.call(val, key) ? val[key] : undefined;
            result[prop.key] = transform(v, prop.typ, getProps, key, ref);
        });
        Object.getOwnPropertyNames(val).forEach(key => {
            if (!Object.prototype.hasOwnProperty.call(props, key)) {
                result[key] = transform(val[key], additional, getProps, key, ref);
            }
        });
        return result;
    }

    if (typ === "any") return val;
    if (typ === null) {
        if (val === null) return val;
        return invalidValue(typ, val, key, parent);
    }
    if (typ === false) return invalidValue(typ, val, key, parent);
    let ref: any = undefined;
    while (typeof typ === "object" && typ.ref !== undefined) {
        ref = typ.ref;
        typ = typeMap[typ.ref];
    }
    if (Array.isArray(typ)) return transformEnum(typ, val);
    if (typeof typ === "object") {
        return typ.hasOwnProperty("unionMembers") ? transformUnion(typ.unionMembers, val)
            : typ.hasOwnProperty("arrayItems")    ? transformArray(typ.arrayItems, val)
            : typ.hasOwnProperty("props")         ? transformObject(getProps(typ), typ.additional, val)
            : invalidValue(typ, val, key, parent);
    }
    // Numbers can be parsed by Date but shouldn't be.
    if (typ === Date && typeof val !== "number") return transformDate(val);
    return transformPrimitive(typ, val);
}

function cast<T>(val: any, typ: any): T {
    return transform(val, typ, jsonToJSProps);
}

function uncast<T>(val: T, typ: any): any {
    return transform(val, typ, jsToJSONProps);
}

function l(typ: any) {
    return { literal: typ };
}

function a(typ: any) {
    return { arrayItems: typ };
}

function u(...typs: any[]) {
    return { unionMembers: typs };
}

function o(props: any[], additional: any) {
    return { props, additional };
}

function m(additional: any) {
    return { props: [], additional };
}

function r(name: string) {
    return { ref: name };
}

const typeMap: any = {
    "Welcome": o([
        { json: "items", js: "items", typ: a(r("Item")) },
    ], false),
    "Item": o([
        { json: "$type", js: "$type", typ: r("Type") },
        { json: "links", js: "links", typ: a(r("Link")) },
        { json: "permissions", js: "permissions", typ: a(r("Permission")) },
        { json: "additionalObjects", js: "additionalObjects", typ: r("AdditionalObjects") },
        { json: "studiewijzerItem", js: "studiewijzerItem", typ: r("StudiewijzerItem") },
        { json: "sortering", js: "sortering", typ: 0 },
        { json: "lesgroep", js: "lesgroep", typ: r("Lesgroep") },
        { json: "datumTijd", js: "datumTijd", typ: Date },
        { json: "aangemaaktOpDatumTijd", js: "aangemaaktOpDatumTijd", typ: u(undefined, Date) },
    ], false),
    "AdditionalObjects": o([
    ], false),
    "Lesgroep": o([
        { json: "links", js: "links", typ: a(r("Link")) },
        { json: "permissions", js: "permissions", typ: a(r("Permission")) },
        { json: "additionalObjects", js: "additionalObjects", typ: r("AdditionalObjects") },
        { json: "UUID", js: "UUID", typ: "" },
        { json: "naam", js: "naam", typ: "" },
        { json: "omschrijving", js: "omschrijving", typ: "" },
        { json: "schooljaar", js: "schooljaar", typ: r("Schooljaar") },
        { json: "vak", js: "vak", typ: r("Vak") },
        { json: "heeftStamgroep", js: "heeftStamgroep", typ: true },
        { json: "examendossierOndersteund", js: "examendossierOndersteund", typ: true },
        { json: "vestiging", js: "vestiging", typ: r("Vestiging") },
    ], false),
    "Link": o([
        { json: "id", js: "id", typ: 0 },
        { json: "rel", js: "rel", typ: r("Rel") },
        { json: "type", js: "type", typ: r("Type") },
        { json: "href", js: "href", typ: "" },
    ], false),
    "Permission": o([
        { json: "full", js: "full", typ: "" },
        { json: "type", js: "type", typ: r("Type") },
        { json: "operations", js: "operations", typ: a(r("Operation")) },
        { json: "instances", js: "instances", typ: a("") },
    ], false),
    "Schooljaar": o([
        { json: "$type", js: "$type", typ: r("Type") },
        { json: "links", js: "links", typ: a(r("Link")) },
        { json: "permissions", js: "permissions", typ: a(r("Permission")) },
        { json: "additionalObjects", js: "additionalObjects", typ: r("AdditionalObjects") },
        { json: "naam", js: "naam", typ: r("SchooljaarNaam") },
        { json: "vanafDatum", js: "vanafDatum", typ: Date },
        { json: "totDatum", js: "totDatum", typ: Date },
        { json: "isHuidig", js: "isHuidig", typ: true },
    ], false),
    "Vak": o([
        { json: "links", js: "links", typ: a(r("Link")) },
        { json: "permissions", js: "permissions", typ: a(r("Permission")) },
        { json: "additionalObjects", js: "additionalObjects", typ: r("AdditionalObjects") },
        { json: "afkorting", js: "afkorting", typ: "" },
        { json: "naam", js: "naam", typ: "" },
        { json: "UUID", js: "UUID", typ: "" },
    ], false),
    "Vestiging": o([
        { json: "links", js: "links", typ: a(r("Link")) },
        { json: "permissions", js: "permissions", typ: a(r("Permission")) },
        { json: "additionalObjects", js: "additionalObjects", typ: r("AdditionalObjects") },
        { json: "naam", js: "naam", typ: r("VestigingNaam") },
        { json: "uuid", js: "uuid", typ: "" },
    ], false),
    "StudiewijzerItem": o([
        { json: "links", js: "links", typ: a(r("Link")) },
        { json: "permissions", js: "permissions", typ: a(r("Permission")) },
        { json: "additionalObjects", js: "additionalObjects", typ: r("AdditionalObjects") },
        { json: "onderwerp", js: "onderwerp", typ: "" },
        { json: "huiswerkType", js: "huiswerkType", typ: r("HuiswerkType") },
        { json: "omschrijving", js: "omschrijving", typ: "" },
        { json: "inleverperiodes", js: "inleverperiodes", typ: true },
        { json: "lesmateriaal", js: "lesmateriaal", typ: true },
        { json: "projectgroepen", js: "projectgroepen", typ: true },
        { json: "bijlagen", js: "bijlagen", typ: a("any") },
        { json: "externeMaterialen", js: "externeMaterialen", typ: a("any") },
        { json: "inlevermomenten", js: "inlevermomenten", typ: a("any") },
        { json: "tonen", js: "tonen", typ: true },
        { json: "notitieZichtbaarVoorLeerling", js: "notitieZichtbaarVoorLeerling", typ: true },
        { json: "leerdoelen", js: "leerdoelen", typ: "" },
    ], false),
    "Type": [
        "instelling.RVestiging",
        "lesgroep.RLesgroep",
        "onderwijsinrichting.RSchooljaar",
        "onderwijsinrichting.RVak",
        "studiewijzer.RSWIAfspraakToekenning",
        "studiewijzer.RStudiewijzerItem",
    ],
    "Rel": [
        "self",
    ],
    "Operation": [
        "READ",
    ],
    "SchooljaarNaam": [
        "2024/2025",
    ],
    "VestigingNaam": [
        "Revius Lyceum Doorn",
    ],
    "HuiswerkType": [
        "HUISWERK",
    ],
};

