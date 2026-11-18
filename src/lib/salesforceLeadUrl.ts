// Approved Lightning navigation only. No Salesforce API, tracking, persistence or submission.
import type {SalesforceFields} from './salesforceContacts';
export const SALESFORCE_ORIGIN='https://d1r000000gheeea2.lightning.force.com';
export const SALESFORCE_RECORD_TYPE='012Sr0000044uCbIAI';
export const SALESFORCE_NEW_LEAD='/lightning/o/Lead/new';
// Exact choices supplied by the user for this organisation's New Lead form, 18 Nov 2026.
// --None-- is represented by an empty string and is never submitted as a field value.
export const LEAD_INDUSTRIES=[
 'Clothing','Oil and Gas Extraction','Other Financial Investment Activities','Recruitment and Placing Agencies','Utilities','Alcohol and Tobacco','Arms, Weapons and Munitions','Art and Antiques','Banking, Insurance and Regulated Financial Services','Books and Publishing','Business Support Services and Outsourcing','Chemicals and Synthetic Materials','Charities and Not-for-Profit Organisations','Cleaning Services','Computer Software','Construction, Engineering and Building Services','Consulting and Professional Services','Education Services','Electronics, Telecommunications and Photographic Equipment','Agriculture and Farming','Food and Beverage','Freight and Logistics','Furniture and Homewares','Gambling and Gaming','Glass Manufacturing and Products','Hospitality, Hotels and Restaurants','Industrial Equipment, Machinery and Tools','Individuals','IT Services','Jewellery, Precious Stones and Minerals','Clothing Manufacturing','Rubber, Plastic and Synthetic Material Manufacturing','Media Services','Medical equipment','Healthcare and Medical Services','Pharmaceuticals and Medicines','Metal Fabrication','Metals and Commodities Trading','Mining and Natural Resources','Musical Instruments','Paper and Paper Products','Personal Care and Cosmetics','Pharmaceutical Manufacturing','Printing and Packaging','Natural Resource Processing and Refinement','Professional Services (Legal, Accounting, Actuarial)','Public Administration and Government','Public Transport','Publishing and Printing','Religious Organisations','Real Estate and Property Services','Scrap and Recycling Trading','Security Services','Sporting Goods','Stationery','Stone and Mineral Products','Media, Entertainment and Broadcasting','Textiles (Non-Clothing)','Arts, Culture and Sports Organisations','Tools and Building Supplies','Tourism and Travel Services','Unlicensed Financial Services','Vehicles and Transportation Equipment','Waste Management and Recycling'
] as const;
export function acceptedIndustry(value:string){return (LEAD_INDUSTRIES as readonly string[]).includes(value)?value:''}
export const LEAD_FIELD_MAP:[keyof SalesforceFields,string][]=[['company','Company'],['firstName','FirstName'],['lastName','LastName'],['title','Title'],['phone','Phone'],['email','Email'],['industry','Industry']];
// Escape each raw value once inside Salesforce's comma-separated name=value format.
// The serialized format is then encoded once as a query value. These are separate
// decoding boundaries: never URI-encode a field twice or pre-encode the URL itself.
const encodeValue=(value:string)=>encodeURIComponent(value).replace(/[!'()*]/g,c=>'%'+c.charCodeAt(0).toString(16).toUpperCase());
export function salesforceLeadUrl(fields:SalesforceFields){
 const pairs=LEAD_FIELD_MAP.flatMap(([key,apiName])=>{const value=key==='industry'?acceptedIndustry(fields.industry):fields[key];return value.trim()?[apiName+'='+encodeValue(value)]:[]});
 const url=new URL(SALESFORCE_NEW_LEAD,SALESFORCE_ORIGIN);
 url.searchParams.set('recordTypeId',SALESFORCE_RECORD_TYPE);
 url.searchParams.set('defaultFieldValues',pairs.join(','));
 return url.href;
}
