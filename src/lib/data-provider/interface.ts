import {
    User,
    Game,
    Ticket,
    CreateUserInput,
    CreateGameInput,
    CreateTicketInput,
    Place,
    Tool,
    CreateToolInput,
    UpdateUserInput,
    UpdateGameInput,
    UpdateTicketInput
} from './types';

export interface IDataProvider {
    // User Management
    getUserByEmail(email: string): Promise<User | null>;
    getUserById(id: string): Promise<User | null>;
    createUser(input: CreateUserInput): Promise<User>;
    updateUser(id: string, updates: UpdateUserInput): Promise<void>;
    deleteUser(id: string): Promise<void>;
    updateUserPassword(userId: string, newPassword: string): Promise<void>;
    addPlaceToUser(userId: string, placeId: string): Promise<void>;
    removePlaceFromUser(userId: string, placeId: string): Promise<void>;
    getUsers(): Promise<User[]>;

    // Auth Validation (returns User if valid, null otherwise)
    validateCredentials(email: string, passwordPlain: string): Promise<User | null>;

    // Place Management
    getPlaces(): Promise<Place[]>;
    createPlace(name: string, address?: string): Promise<Place>;
    updatePlace(id: string, name: string, address?: string): Promise<void>;
    deletePlace(id: string): Promise<void>;

    // Game Management
    getGames(): Promise<Game[]>;
    createGame(input: CreateGameInput): Promise<Game>;
    updateGame(id: string, updates: UpdateGameInput): Promise<void>;
    deleteGame(id: string): Promise<void>;
    getGameById(id: string): Promise<Game | null>;

    // Tool Management
    getToolsByPlace(placeId: string): Promise<Tool[]>;
    createTool(input: CreateToolInput): Promise<Tool>;
    updateTool(placeId: string, id: string, updates: Partial<Pick<Tool, 'name' | 'type' | 'parameters' | 'id'>>): Promise<void>;
    deleteTool(placeId: string, id: string): Promise<void>;

    // Ticket Management
    createTicket(input: CreateTicketInput): Promise<Ticket>;
    getTicketById(id: string): Promise<Ticket | null>;
    updateTicket(id: string, updates: Partial<Pick<Ticket, 'trelloCardId' | 'trelloCardUrl' | 'status'>>): Promise<void>;
    updateTicketByUser(id: string, userId: string, updates: UpdateTicketInput): Promise<void>;
    deleteTicketByUser(id: string, userId: string): Promise<void>;
    deleteTicket(id: string): Promise<void>; // Admin only
    getTicketsByUser(userId: string): Promise<Ticket[]>;
    getAllTickets(): Promise<Ticket[]>; // Admin only
}
