import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import mongoose from 'mongoose';
import { Location, LocationDocument } from './schemas/location.schema.js';
import { CreateLocationDto } from './dto/create-location.dto.js';
import { UpdateLocationDto } from './dto/update-location.dto.js';

@Injectable()
export class LocationsService {
  constructor(
    @InjectModel(Location.name) private locationModel: mongoose.Model<LocationDocument>,
  ) {}

  async create(createLocationDto: CreateLocationDto): Promise<Location> {
    const { code } = createLocationDto;

    // Case-insensitive duplicate check
    const existing = await this.locationModel.findOne({ code: new RegExp(`^${code}$`, 'i') }).exec();
    if (existing) {
      throw new BadRequestException(`Location code ${code} already exists.`);
    }

    const createdLocation = new this.locationModel(createLocationDto);
    return createdLocation.save();
  }

  async findAll(): Promise<Location[]> {
    return this.locationModel.find().exec();
  }

  async findOne(code: string): Promise<Location> {
    const location = await this.locationModel.findOne({ code }).exec();
    if (!location) {
      throw new NotFoundException(`Location with code ${code} not found`);
    }
    return location;
  }

  async update(code: string, updateLocationDto: UpdateLocationDto): Promise<Location> {
    const locationToUpdate = await this.findOne(code);

    const updatedLocation = await this.locationModel
      .findOneAndUpdate({ code }, updateLocationDto, { new: true })
      .exec();

    if (!updatedLocation) {
      throw new NotFoundException(`Location with code ${code} not found`);
    }
    
    return updatedLocation;
  }

  async remove(code: string): Promise<Location> {
    const deletedLocation = await this.locationModel.findOneAndDelete({ code }).exec();
    if (!deletedLocation) {
      throw new NotFoundException(`Location with code ${code} not found`);
    }
    return deletedLocation;
  }
}
