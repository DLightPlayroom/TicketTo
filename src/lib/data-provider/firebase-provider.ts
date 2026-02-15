import {
    collection,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    doc,
    query,
    where,
    limit,
    orderBy,
    Timestamp,
    deleteDoc,
    setDoc
} from 'firebase/firestore';
import { IDataProvider } from './interface';
import { CreateGameInput, CreateTicketInput, CreateUserInput, Game, Place, Ticket, User, Tool, CreateToolInput, UpdateUserInput, UpdateGameInput, UpdateTicketInput } from './types';
import { pbkdf2Sync, randomBytes } from 'node:crypto';
import { db } from '../firebase';

export class FirebaseProvider implements IDataProvider {

    private hashPassword(password: string): string {
        const salt = randomBytes(16).toString('hex');
        const hash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
        return `${salt}:${hash}`;
    }

    private verifyPassword(password: string, storedHash: string): boolean {
        const [salt, hash] = storedHash.split(':');
        if (!salt || !hash) return false;
        const verifyHash = pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
        return hash === verifyHash;
    }

    async getUserByEmail(email: string): Promise<User | null> {
        const normalizedEmail = email.toLowerCase();
        const q = query(collection(db, 'users'), where('email', '==', normalizedEmail), limit(1));
        const snapshot = await getDocs(q);

        if (snapshot.empty) return null;
        const d = snapshot.docs[0];
        const data = d.data();

        // safe date conversion
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();

        return { id: d.id, ...data, createdAt } as unknown as User;
    }

    async getUserById(id: string): Promise<User | null> {
        const d = await getDoc(doc(db, 'users', id));
        if (!d.exists()) return null;
        const data = d.data();
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
        return { id: d.id, ...data, createdAt } as unknown as User;
    }

    async getUsers(): Promise<User[]> {
        const snap = await getDocs(collection(db, 'users'));
        return snap.docs.map(d => {
            const data = d.data();
            const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
            return { id: d.id, ...data, createdAt } as unknown as User;
        });
    }

    async createUser(input: CreateUserInput): Promise<User> {
        let passwordHash: string | undefined;

        if (!input.isGoogleAccount) {
            passwordHash = input.password ? this.hashPassword(input.password) : this.hashPassword(randomBytes(8).toString('hex'));
        }

        const newUser: any = {
            name: input.name,
            email: input.email.toLowerCase(),
            phone: input.phone || null,
            isAdmin: input.isAdmin,
            places: [],
            createdAt: Timestamp.now(), // Use Server Timestamp if possible, but client SDK needs explicit
        };

        if (passwordHash) {
            newUser.password = passwordHash;
        }

        // Note: Places handling skipped for brevity as per previous implementation logic
        // We would fetch IDs and store them.

        const res = await addDoc(collection(db, 'users'), newUser);
        return { id: res.id, ...newUser, createdAt: new Date() } as unknown as User;
    }

    async updateUser(id: string, updates: UpdateUserInput): Promise<void> {
        const updateData: any = {};
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.email !== undefined) updateData.email = updates.email.toLowerCase();
        if (updates.phone !== undefined) updateData.phone = updates.phone || null;
        if (updates.isAdmin !== undefined) updateData.isAdmin = updates.isAdmin;
        await updateDoc(doc(db, 'users', id), updateData);
    }

    async deleteUser(id: string): Promise<void> {
        // Delete user - cascade deletes will handle tickets in Firestore rules/backend logic
        await deleteDoc(doc(db, 'users', id));
        // Also need to delete user's tickets
        const ticketsQuery = query(collection(db, 'tickets'), where('userId', '==', id));
        const ticketsSnap = await getDocs(ticketsQuery);
        await Promise.all(ticketsSnap.docs.map(d => deleteDoc(d.ref)));
    }

    async updateUserPassword(userId: string, newPassword: string): Promise<void> {
        const hash = this.hashPassword(newPassword);
        await updateDoc(doc(db, 'users', userId), { password: hash });
    }

    async addPlaceToUser(userId: string, placeId: string): Promise<void> {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) throw new Error('User not found');
        const currentPlaces = (userDoc.data().places || []) as string[];
        if (!currentPlaces.includes(placeId)) {
            currentPlaces.push(placeId);
            await updateDoc(doc(db, 'users', userId), { places: currentPlaces });
        }
    }

    async removePlaceFromUser(userId: string, placeId: string): Promise<void> {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (!userDoc.exists()) throw new Error('User not found');
        const currentPlaces = (userDoc.data().places || []) as string[];
        const filtered = currentPlaces.filter(p => p !== placeId);
        await updateDoc(doc(db, 'users', userId), { places: filtered });
    }

    async validateCredentials(email: string, passwordPlain: string): Promise<User | null> {
        const normalizedEmail = email.toLowerCase();
        const user = await this.getUserByEmail(normalizedEmail);
        if (!user) return null;

        const storedPw = (user as any).password || user.passwordHash;
        if (!storedPw) return null;

        const isValid = this.verifyPassword(passwordPlain, storedPw);
        return isValid ? user : null;
    }

    async getPlaces(): Promise<Place[]> {
        const snap = await getDocs(collection(db, 'places'));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Place));
    }

    async createPlace(name: string, address?: string): Promise<Place> {
        const data: any = { name };
        if (address) {
            data.address = address;
        } else {
            data.address = null;
        }
        const res = await addDoc(collection(db, 'places'), data);
        return { id: res.id, ...data } as Place;
    }

    async updatePlace(id: string, name: string, address?: string): Promise<void> {
        const data: any = { name };
        if (address !== undefined) {
            data.address = address || null;
        }
        await updateDoc(doc(db, 'places', id), data);
    }

    async deletePlace(id: string): Promise<void> {
        // Delete all tools associated with this place first
        const toolsQuery = query(collection(db, 'places', id, 'tools'));
        const toolsSnap = await getDocs(toolsQuery);
        await Promise.all(toolsSnap.docs.map(d => deleteDoc(d.ref)));
        // Then delete the place
        await deleteDoc(doc(db, 'places', id));
    }

    async getGames(): Promise<Game[]> {
        const snap = await getDocs(collection(db, 'games'));
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as Game));
    }

    async createGame(input: CreateGameInput): Promise<Game> {
        const res = await addDoc(collection(db, 'games'), input);
        return { id: res.id, ...input };
    }

    async updateGame(id: string, updates: UpdateGameInput): Promise<void> {
        const updateData: any = {};
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.trelloListId !== undefined) updateData.trelloListId = updates.trelloListId;
        if (updates.trelloListMap !== undefined) updateData.trelloListMap = updates.trelloListMap;
        await updateDoc(doc(db, 'games', id), updateData);
    }

    async deleteGame(id: string): Promise<void> {
        // Delete all tickets associated with this game first
        const ticketsQuery = query(collection(db, 'tickets'), where('gameId', '==', id));
        const ticketsSnap = await getDocs(ticketsQuery);
        await Promise.all(ticketsSnap.docs.map(d => deleteDoc(d.ref)));
        // Then delete the game
        await deleteDoc(doc(db, 'games', id));
    }

    async getGameById(id: string): Promise<Game | null> {
        const d = await getDoc(doc(db, 'games', id));
        return d.exists() ? ({ id: d.id, ...d.data() } as Game) : null;
    }

    // Tool Management
    async getToolsByPlace(placeId: string): Promise<Tool[]> {
        const snap = await getDocs(collection(db, 'places', placeId, 'tools'));
        return snap.docs.map(d => {
            const data = d.data();
            const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
            return { id: d.id, placeId, ...data, createdAt } as Tool;
        });
    }

    async createTool(input: CreateToolInput): Promise<Tool> {
        const toolData = {
            name: input.name,
            type: input.type,
            createdAt: Timestamp.now(),
        };
        await addDoc(collection(db, 'places', input.placeId, 'tools'), { ...toolData });
        // For Firestore, we store tools in a subcollection, but the ID is the MAC address
        // We need to use setDoc instead to control the ID
        const toolRef = doc(db, 'places', input.placeId, 'tools', input.id);
        await updateDoc(doc(db, 'places', input.placeId, 'tools', input.id), toolData).catch(async () => {
            // If doesn't exist, create it
            await addDoc(collection(db, 'places', input.placeId, 'tools'), { ...toolData });
        });
        return { id: input.id, placeId: input.placeId, ...toolData, createdAt: new Date() } as Tool;
    }

    async updateTool(placeId: string, id: string, updates: Partial<Pick<Tool, 'name' | 'type' | 'parameters' | 'id'>>): Promise<void> {
        // If ID is changing, we need to create a new document and delete the old one
        if (updates.id && updates.id !== id) {
            const oldDocRef = doc(db, 'places', placeId, 'tools', id);
            const oldDocSnap = await getDoc(oldDocRef);

            if (!oldDocSnap.exists()) {
                throw new Error('Tool not found');
            }

            const oldData = oldDocSnap.data();
            const newData = {
                ...oldData,
                name: updates.name ?? oldData.name,
                type: updates.type ?? oldData.type,
                parameters: updates.parameters ?? oldData.parameters,
            };

            // Use setDoc to create/overwrite the new ID
            await setDoc(doc(db, 'places', placeId, 'tools', updates.id), newData);

            // Delete old
            await deleteDoc(oldDocRef);
            return;
        }

        const updateData: any = {};
        if (updates.name !== undefined) updateData.name = updates.name;
        if (updates.type !== undefined) updateData.type = updates.type;
        if (updates.parameters !== undefined) updateData.parameters = updates.parameters;

        await updateDoc(doc(db, 'places', placeId, 'tools', id), updateData);
    }

    async deleteTool(placeId: string, id: string): Promise<void> {
        await deleteDoc(doc(db, 'places', placeId, 'tools', id));
    }

    async createTicket(input: CreateTicketInput): Promise<Ticket> {
        const ticket = {
            userId: input.userId,
            gameId: input.gameId,
            title: input.title,
            description: input.description,
            status: 'NEW',
            createdAt: Timestamp.now(),
        };
        const res = await addDoc(collection(db, 'tickets'), ticket);
        return { id: res.id, ...ticket, createdAt: new Date() } as unknown as Ticket;
    }

    async updateTicket(id: string, updates: Partial<Pick<Ticket, 'trelloCardId' | 'trelloCardUrl' | 'status'>>): Promise<void> {
        const updateData: any = {};
        if (updates.trelloCardId !== undefined) updateData.trelloCardId = updates.trelloCardId;
        if (updates.trelloCardUrl !== undefined) updateData.trelloCardUrl = updates.trelloCardUrl;
        if (updates.status !== undefined) updateData.status = updates.status;

        await updateDoc(doc(db, 'tickets', id), updateData);
    }

    async getTicketsByUser(userId: string): Promise<Ticket[]> {
        const q = query(collection(db, 'tickets'), where('userId', '==', userId)); // orderBy requires index often
        const snap = await getDocs(q);
        return snap.docs.map(d => {
            const data = d.data();
            const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
            return { id: d.id, ...data, createdAt } as unknown as Ticket;
        });
    }

    async getAllTickets(): Promise<Ticket[]> {
        const q = query(collection(db, 'tickets'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        return snap.docs.map(d => {
            const data = d.data();
            const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
            return { id: d.id, ...data, createdAt } as unknown as Ticket;
        });
    }

    async getTicketById(id: string): Promise<Ticket | null> {
        const d = await getDoc(doc(db, 'tickets', id));
        if (!d.exists()) return null;
        const data = d.data();
        const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : new Date();
        return { id: d.id, ...data, createdAt } as unknown as Ticket;
    }

    async updateTicketByUser(id: string, userId: string, updates: UpdateTicketInput): Promise<void> {
        // Verify ownership
        const ticket = await this.getTicketById(id);
        if (!ticket || ticket.userId !== userId) {
            throw new Error('Ticket not found or unauthorized');
        }
        const updateData: any = {};
        if (updates.title !== undefined) updateData.title = updates.title;
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.status !== undefined) updateData.status = updates.status;
        await updateDoc(doc(db, 'tickets', id), updateData);
    }

    async deleteTicketByUser(id: string, userId: string): Promise<void> {
        // Verify ownership
        const ticket = await this.getTicketById(id);
        if (!ticket || ticket.userId !== userId) {
            throw new Error('Ticket not found or unauthorized');
        }
        await deleteDoc(doc(db, 'tickets', id));
    }

    async deleteTicket(id: string): Promise<void> {
        // Admin delete - no ownership check
        await deleteDoc(doc(db, 'tickets', id));
    }
}
