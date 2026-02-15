export type ToolType = 'PC' | 'Laptop' | 'VR Headset';

export type Tool = {
    id: string;           // MAC address
    placeId: string;      // Reference to parent place
    name: string;         // Friendly name
    type: ToolType;       // Device type
    parameters?: string;  // Additional parameters/configuration
    createdAt: Date;
};

export type Place = {
    id: string;
    name: string;
    address?: string;
    tools?: Tool[];       // Associated tools
};

export type User = {
    id: string;
    name: string;
    email: string;
    phone?: string;
    passwordHash?: string; // Only relevant for SQL implementation (or hidden in Firebase)
    isAdmin: boolean;
    places: Place[];
    createdAt: Date;
};

export type Game = {
    id: string;
    name: string;
    trelloListId?: string;
    trelloListMap?: {
        NEW?: string;
        IN_PROGRESS?: string;
        DONE?: string;
    };
};

export type TicketStatus = 'NEW' | 'IN_PROGRESS' | 'DONE';

export type Ticket = {
    id: string;
    userId: string;
    gameId: string;
    title: string;
    description: string;
    status: TicketStatus;
    trelloCardId?: string;
    trelloCardUrl?: string;
    createdAt: Date;
};

// Input types for creation
export type CreateUserInput = Omit<User, 'id' | 'createdAt' | 'places'> & {
    placeIds?: string[]; // IDs of existing places
    password?: string;   // Optional, implementation specific
    isGoogleAccount?: boolean; // If true, skip password gen and email
};

export type CreateGameInput = Omit<Game, 'id'>;

export type CreateTicketInput = {
    userId: string;
    gameId: string;
    title: string;
    description: string;
};

export type CreateToolInput = {
    placeId: string;
    name: string;
    type: ToolType;
    id: string;          // MAC address provided by admin
    parameters?: string; // Optional additional parameters
};

// Update input types
export type UpdateUserInput = Partial<Pick<User, 'name' | 'email' | 'phone' | 'isAdmin'>>;
export type UpdateGameInput = Partial<Pick<Game, 'name' | 'trelloListId' | 'trelloListMap'>>;
export type UpdatePlaceInput = Partial<Pick<Place, 'name' | 'address'>>;
export type UpdateTicketInput = Partial<Pick<Ticket, 'title' | 'description' | 'status'>>;
export type UpdateToolInput = Partial<Pick<Tool, 'name' | 'type' | 'parameters'>>;
