export class CreateNotificationDto {
    id_person_from: number;
    id_person_to: number;
    message: string;
}

export class UpdateNotificationStatusDto {
    status: number;
} 