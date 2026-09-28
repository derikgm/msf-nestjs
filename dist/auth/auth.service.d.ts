import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto.js';
export declare class AuthService {
    private readonly jwtService;
    private readonly passwordHash;
    private readonly expiresIn;
    constructor(jwtService: JwtService, config: ConfigService);
    login(dto: LoginDto): Promise<{
        access_token: string;
        token_type: string;
        expires_in: number;
    }>;
}
