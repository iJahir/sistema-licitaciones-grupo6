package com.licitaciones.sistema.config;

import com.fasterxml.jackson.databind.BeanDescription;
import com.fasterxml.jackson.databind.SerializationConfig;
import com.fasterxml.jackson.databind.ser.BeanPropertyWriter;
import com.fasterxml.jackson.databind.ser.BeanSerializerModifier;
import com.fasterxml.jackson.databind.module.SimpleModule;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import java.util.List;

@Configuration
public class JacksonConfig {

    @Bean
    public com.fasterxml.jackson.databind.Module hibernatePropertiesFilterModule() {
        SimpleModule module = new SimpleModule("HibernatePropertiesFilterModule");
        module.setSerializerModifier(new BeanSerializerModifier() {
            @Override
            public List<BeanPropertyWriter> changeProperties(
                    SerializationConfig config, 
                    BeanDescription beanDesc, 
                    List<BeanPropertyWriter> beanProperties) {
                beanProperties.removeIf(writer -> 
                    "hibernateLazyInitializer".equals(writer.getName()) ||
                    "handler".equals(writer.getName()) ||
                    "byteBuddyInterceptor".equals(writer.getName())
                );
                return beanProperties;
            }
        });
        return module;
    }
}
