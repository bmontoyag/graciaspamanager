'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './dialog';

type ConfirmOptions = {
    title: string;
    description?: string;
    confirmText?: string;
    cancelText?: string;
    destructive?: boolean;
};

type ConfirmRequest = ConfirmOptions & { resolve: (value: boolean) => void };

let showConfirm: ((request: ConfirmRequest) => void) | null = null;

/**
 * Reemplazo de window.confirm con el diálogo del portal: `if (!(await confirmDialog('¿Eliminar?'))) return;`
 */
export function confirmDialog(options: ConfirmOptions | string): Promise<boolean> {
    const opts = typeof options === 'string' ? { title: options } : options;
    if (!showConfirm) return Promise.resolve(window.confirm(opts.title));
    return new Promise(resolve => showConfirm!({ ...opts, resolve }));
}

/** Se monta una sola vez en el layout raíz. */
export function ConfirmDialogHost() {
    const [request, setRequest] = useState<ConfirmRequest | null>(null);

    useEffect(() => {
        showConfirm = setRequest;
        return () => {
            showConfirm = null;
        };
    }, []);

    const close = (value: boolean) => {
        request?.resolve(value);
        setRequest(null);
    };

    const destructive = request?.destructive ?? /eliminar|borrar|revertir|quitar/i.test(request?.title || '');

    return (
        <Dialog open={!!request} onOpenChange={open => !open && close(false)}>
            <DialogContent className="max-w-md" showCloseButton={false}>
                <DialogHeader className="pr-0">
                    <div className="flex items-start gap-3">
                        {destructive && (
                            <div className="rounded-full bg-destructive/10 p-2 text-destructive">
                                <AlertTriangle className="h-5 w-5" />
                            </div>
                        )}
                        <div className="space-y-1.5">
                            <DialogTitle className="text-lg">{request?.title}</DialogTitle>
                            {request?.description && <DialogDescription>{request.description}</DialogDescription>}
                        </div>
                    </div>
                </DialogHeader>
                <DialogFooter>
                    <button
                        type="button"
                        onClick={() => close(false)}
                        className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
                    >
                        {request?.cancelText || 'Cancelar'}
                    </button>
                    <button
                        type="button"
                        autoFocus
                        onClick={() => close(true)}
                        className={`rounded-md px-4 py-2 text-sm font-medium text-white hover:opacity-90 ${destructive ? 'bg-destructive' : 'bg-primary'}`}
                    >
                        {request?.confirmText || (destructive ? 'Sí, continuar' : 'Confirmar')}
                    </button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
