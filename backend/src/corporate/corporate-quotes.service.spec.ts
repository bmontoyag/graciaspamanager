import { CorporateQuotesService } from './corporate-quotes.service';

describe('CorporateQuotesService totals', () => {
    const service = new CorporateQuotesService({} as any);
    const computeTotals = (service as any).computeTotals.bind(service);
    const items = [{ description: 'Jornada de masajes', quantity: 2, unitPrice: 2000 }];

    it('sin IGV: total = subtotal - descuento', () => {
        expect(computeTotals(items, 100, false, false, 18)).toEqual({ subtotal: 4000, igvAmount: 0, total: 3900 });
    });

    it('IGV adicional: suma 18% sobre la base', () => {
        expect(computeTotals(items, 0, true, false, 18)).toEqual({ subtotal: 4000, igvAmount: 720, total: 4720 });
    });

    it('IGV incluido: el total no cambia y se desglosa el IGV contenido', () => {
        expect(computeTotals(items, 0, true, true, 18)).toEqual({ subtotal: 4000, igvAmount: 610.17, total: 4000 });
    });

    it('el descuento no deja la base en negativo', () => {
        expect(computeTotals(items, 5000, true, false, 18)).toEqual({ subtotal: 4000, igvAmount: 0, total: 0 });
    });
});
