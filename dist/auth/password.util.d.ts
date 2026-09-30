export declare const HASH_FICTICIO = "scrypt$0e0ec1ebfdad87bd820ccb1dfd6f57e9$f03313b7cab836fed7360ee31633a1b18ecfa00fcc66f1e7d7a8901527dc56a9aa6e7060730a6be577fecb064ed26b28a1108a1442a5616adcb52516521aaa0d";
export declare function hashPassword(password: string): string;
export declare function verifyPassword(password: string, stored: string): boolean;
