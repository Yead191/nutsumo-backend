import crypto from 'crypto';
type caseType = "uppercase"|"lowercase"|"number"
export const getRandomId = (prefix?:string,length: number=6,caseType:caseType="uppercase"): string => {
    const randomBytes = crypto.randomBytes(length);
    const randomId = randomBytes.toString('hex')
    const id =  prefix ? `${prefix}${randomId}` : randomId;
    const numberId = Math.floor(Math.random() * 1000000);
    if(caseType=='number'){
        return prefix+ numberId.toString();
    }

    return caseType=='uppercase' ? id.toUpperCase() : id.toLowerCase();
    
};