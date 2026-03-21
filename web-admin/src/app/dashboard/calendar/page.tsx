'use client';

import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
// import FullCalendar from '@fullcalendar/react';
// import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import AppointmentDialog from '@/components/appointments/AppointmentDialog';
import { PageContainer } from '@/components/layout/PageContainer';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import { useRef } from 'react';

export default function CalendarPage() {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    const [appointments, setAppointments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [selectedAppointment, setSelectedAppointment] = useState<any>(null);
    const calendarRef = useRef<any>(null);

    const [config, setConfig] = useState({
        openTime: '09:00',
        closeTime: '21:00',
        appointmentBuffer: 10
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [appointmentsRes, configRes] = await Promise.all([
                fetch(`${API_URL}/appointments`),
                fetch(`${API_URL}/configuration`)
            ]);

            const appointmentsData = await appointmentsRes.json();
            setAppointments(Array.isArray(appointmentsData) ? appointmentsData : []);

            const configData = await configRes.json();
            if (configData) {
                setConfig({
                    openTime: configData.openTime || '09:00',
                    closeTime: configData.closeTime || '21:00',
                    appointmentBuffer: configData.appointmentBuffer || 10
                });
            }
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const events = appointments.map(appt => ({
        id: appt.id.toString(),
        title: `${appt.client?.name || 'Cliente'} - ${appt.service?.name || 'Servicio'}`,
        start: appt.date,
        end: appt.date,
        backgroundColor:
            appt.status === 'CONFIRMED' ? '#059669' : // Emerald 600
                appt.status === 'PENDING' ? '#d97706' :   // Amber 600
                    appt.status === 'COMPLETED' ? '#2563eb' : // Blue 600
                        appt.status === 'CANCELLED' || appt.status === 'NO_SHOW' ? '#dc2626' : // Red 600
                            '#4b5563', // Gray 600
        borderColor:
            appt.status === 'CONFIRMED' ? '#047857' : 
                appt.status === 'PENDING' ? '#b45309' :
                    appt.status === 'COMPLETED' ? '#1d4ed8' :
                        appt.status === 'CANCELLED' || appt.status === 'NO_SHOW' ? '#b91c1c' :
                            '#374151',
        extendedProps: {
            // Pass full appointment object for editing
            originalAppointment: appt
        }
    }));

    const handleDateClick = (arg: any) => {
        setSelectedDate(arg.dateStr);
        setSelectedAppointment(null);
        setIsDialogOpen(true);
    };

    const handleEventClick = (info: any) => {
        const appointment = info.event.extendedProps.originalAppointment;
        if (appointment) {
            setSelectedAppointment(appointment);
            setIsDialogOpen(true);
        }
    };

    return (
        <PageContainer>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-serif font-bold">Calendario de Citas</h1>
                <button
                    onClick={() => {
                        setSelectedDate('');
                        setSelectedAppointment(null);
                        setIsDialogOpen(true);
                    }}
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-md flex items-center gap-2 hover:opacity-90"
                >
                    <Plus className="h-4 w-4" />
                    Nueva Cita
                </button>
            </div>

            <div className="bg-card rounded-lg border shadow-sm p-4">
                <div className="flex flex-wrap gap-4 mb-4 text-sm font-medium">
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-[#059669]"></div>
                        <span>Confirmado</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-[#d97706]"></div>
                        <span>Pendiente</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-[#2563eb]"></div>
                        <span>Completado</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded-full bg-[#dc2626]"></div>
                        <span>Cancelado / No asistió</span>
                    </div>
                </div>

                {loading ? (
                    <div className="text-center py-12 text-muted-foreground">Cargando calendario...</div>
                ) : (
                    <FullCalendar
                        ref={calendarRef}
                        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                        initialView="dayGridMonth"
                        locale={esLocale}
                        headerToolbar={{
                            left: 'prev,next today',
                            center: 'title',
                            right: 'dayGridMonth,timeGridWeek,timeGridDay'
                        }}
                        buttonText={{
                            today: 'Hoy',
                            month: 'Mes',
                            week: 'Semana',
                            day: 'Día'
                        }}
                        events={events}
                        dateClick={handleDateClick}
                        eventClick={handleEventClick}
                        editable={false}
                        selectable={true}
                        selectMirror={true}
                        dayMaxEvents={true}
                        weekends={true}
                        height="auto"
                        eventTimeFormat={{
                            hour: '2-digit',
                            minute: '2-digit',
                            meridiem: false
                        }}
                        businessHours={{
                            daysOfWeek: [1, 2, 3, 4, 5, 6, 0], // Every day open? or config specific?
                            startTime: config.openTime,
                            endTime: config.closeTime,
                        }}
                        slotMinTime={config.openTime.split(':')[0] + ':00:00'} // Start view a bit earlier? Maybe exact is fine.
                        slotMaxTime={config.closeTime.split(':')[0] === '23' ? '24:00:00' : (parseInt(config.closeTime.split(':')[0]) + 1) + ':00:00'} // Show until close + 1h
                    />
                )}
            </div>

            <AppointmentDialog
                isOpen={isDialogOpen}
                onClose={() => setIsDialogOpen(false)}
                onSave={fetchData}
                initialDate={selectedDate}
                appointment={selectedAppointment}
                config={config}
            />
        </PageContainer>
    );
}
