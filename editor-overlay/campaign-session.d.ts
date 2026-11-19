export function readSession(): { owner: string; login: string } | null;
export function loadAccount(): Promise<{owner:string;login:string;role:string;characters:import("./src/CampaignCloudTypes").CharacterRow[]}>;
export function saveCharacter(character: {avatar_name:string;level:number;sheet:import("./src/domain/characterData").CharacterData;notes:string}, record?: {id:string;updated_at:string}): Promise<import("./src/CampaignCloudTypes").CharacterRow>;
export function deleteCharacter(id: string): Promise<void>;
export function signOut(): Promise<void>;
