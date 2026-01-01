import Dexie, { type Table } from 'dexie';

// Definimos qué forma tienen nuestros datos
export interface Segment {
    id: string;
    start: number;
    end: number;
    note: string;
    color?: string;
}

export interface Project {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
    audioBlob: Blob; // ¡Aquí guardamos el video/audio real!
    bpm: number;
    segments: Segment[];
}

// Creamos la clase de la Base de Datos
export class KueDatabase extends Dexie {
    projects!: Table<Project>;

    constructor() {
        super('KueStudioDB');
        this.version(1).stores({
            projects: 'id, name, createdAt' // Estos son los campos por los que podemos buscar rápido
        });
    }
}

export const db = new KueDatabase();
