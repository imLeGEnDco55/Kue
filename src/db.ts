import Dexie, { type Table } from 'dexie';
import type { Project } from './types';

// Re-export types for convenience
export type { Project, Segment } from './types';

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
